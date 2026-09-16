import { z } from 'zod';
import { TokenBucketRateLimiter } from './rateLimiter.js';
import { parseAndValidateJson } from './jsonParser.js';
import { env } from '../config/env.js';

export class LlmError extends Error {
  public status?: number;
  public provider: string;
  public details?: unknown;

  constructor(message: string, provider: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'LlmError';
    this.provider = provider;
    this.status = status;
    this.details = details;
  }
}

export interface LlmClientOptions {
  /** Primary Gemini API key. Defaults to process.env.GEMINI_API_KEY. */
  apiKey?: string;
  /** Primary model name. Defaults to process.env.GEMINI_MODEL. */
  model?: string;
  /** Sampling temperature. Defaults to 0.2 for deterministic schema adherence. */
  temperature?: number;
  /** Maximum retry attempts for transient / rate limit errors. Defaults to 4. */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff. Defaults to 1000 ms. */
  baseDelayMs?: number;
  /** Max delay in ms for exponential backoff. Defaults to 16000 ms. */
  maxDelayMs?: number;
  /** Shared rate limiter instance. If omitted, a default 15 RPM limiter is created. */
  rateLimiter?: TokenBucketRateLimiter;
  /** Secondary fallback API key (e.g. Groq or OpenRouter). Defaults to process.env.GROQ_API_KEY. */
  fallbackApiKey?: string;
  /** Secondary fallback model. Defaults to process.env.GROQ_MODEL. */
  fallbackModel?: string;
  /** Custom fetch implementation for testing / mocking. */
  fetchFn?: typeof fetch;
}

export interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  estimatedTokens?: number;
}

/**
 * Computes exponential backoff delay with random jitter:
 * delay = min(maxDelay, baseDelay * (2 ** attempt) + randomJitter)
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 16000
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(maxDelayMs, exponential + jitter);
}

/**
 * Resilient multi-provider LLM client with token-bucket rate limiting,
 * exponential backoff with jitter on 429/500/503 errors, provider fallback,
 * and deterministic JSON extraction and validation.
 */
export class LlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly fallbackApiKey?: string;
  private readonly fallbackModel: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: LlmClientOptions = {}) {
    this.apiKey = options.apiKey ?? env.GEMINI_API_KEY ?? '';
    this.model = options.model ?? env.GEMINI_MODEL ?? '';
    this.temperature = options.temperature ?? 0.2;
    this.maxRetries = options.maxRetries ?? 4;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 16000;
    this.rateLimiter =
      options.rateLimiter ??
      new TokenBucketRateLimiter({
        requestsPerMinute: 15, // Gemini Flash free tier
        tokensPerMinute: 32000,
        maxConcurrency: 2,
      });
    this.fallbackApiKey = options.fallbackApiKey ?? env.GROQ_API_KEY;
    this.fallbackModel =
      options.fallbackModel ?? env.GROQ_MODEL ?? '';
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  /**
   * Generates raw text using primary Gemini provider with exponential backoff and fallback.
   */
  public async generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const temperature = options.temperature ?? this.temperature;
    const estimatedTokens = options.estimatedTokens ?? Math.ceil(prompt.length / 4) + 1000;

    // Execute through rate limiter to smooth bursts
    return this.rateLimiter.schedule(async () => {
      return this.executeWithRetry(prompt, temperature, options.systemInstruction);
    }, estimatedTokens);
  }

  /**
   * Generates structured output validated against a Zod schema.
   */
  public async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: GenerateOptions = {}
  ): Promise<T> {
    const rawText = await this.generateText(prompt, options);
    return parseAndValidateJson<T>(rawText, schema);
  }

  /**
   * Executes LLM request with exponential backoff on retryable HTTP errors.
   */
  private async executeWithRetry(
    prompt: string,
    temperature: number,
    systemInstruction?: string
  ): Promise<string> {
    let lastError: unknown;

    // 1. Try primary provider (Gemini)
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.callGemini(prompt, temperature, systemInstruction);
      } catch (err: unknown) {
        lastError = err;
        const status = err instanceof LlmError ? err.status : undefined;

        // Check if retryable: 429 (Rate Limit), 500, 502, 503, 504
        const isRetryable =
          status === 429 ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          (err instanceof Error && err.name === 'AbortError');

        if (!isRetryable || attempt === this.maxRetries) {
          break;
        }

        const delay = calculateBackoffDelay(attempt, this.baseDelayMs, this.maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // 2. If primary exhausted and secondary fallback configured with a valid API key, attempt fallback
    if (this.fallbackApiKey) {
      try {
        return await this.callGroq(prompt, temperature, systemInstruction);
      } catch (fallbackErr) {
        lastError = fallbackErr;
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new LlmError(
      `LLM generation failed after ${this.maxRetries} retries: ${message}`,
      'gemini',
      lastError instanceof LlmError ? lastError.status : undefined,
      lastError
    );
  }

  /**
   * Invokes Google Gemini REST generateContent API.
   */
  private async callGemini(
    prompt: string,
    temperature: number,
    systemInstruction?: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new LlmError(
        'GEMINI_API_KEY is not configured. Please supply an API key in your environment.',
        'gemini'
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new LlmError(
        `Gemini API HTTP ${response.status}: ${errorText}`,
        'gemini',
        response.status,
        errorText
      );
    }

    const data = (await response.json()) as any;
    const candidate = data?.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new LlmError(
        'Gemini API returned an empty or blocked candidate response.',
        'gemini',
        200,
        data
      );
    }

    return textPart;
  }

  /**
   * Invokes Groq / OpenAI compatible completions API as fallback provider.
   */
  private async callGroq(
    prompt: string,
    temperature: number,
    systemInstruction?: string
  ): Promise<string> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.fallbackApiKey}`,
      },
      body: JSON.stringify({
        model: this.fallbackModel,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new LlmError(
        `Groq API HTTP ${response.status}: ${errorText}`,
        'groq',
        response.status,
        errorText
      );
    }

    const data = (await response.json()) as any;
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new LlmError('Groq API returned an empty choice response.', 'groq', 200, data);
    }

    return content;
  }
}
