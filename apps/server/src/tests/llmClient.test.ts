import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  LlmClient,
  LlmError,
  calculateBackoffDelay,
} from '../llm/client.js';
import { TokenBucketRateLimiter } from '../llm/rateLimiter.js';

describe('Phase 3: Resilient LLM Client & Exponential Backoff', () => {
  describe('calculateBackoffDelay', () => {
    it('increases delay exponentially and caps at maxDelayMs', () => {
      const d0 = calculateBackoffDelay(0, 100, 2000);
      const d1 = calculateBackoffDelay(1, 100, 2000);
      const d2 = calculateBackoffDelay(2, 100, 2000);
      const dMax = calculateBackoffDelay(10, 100, 2000);

      expect(d0).toBeGreaterThanOrEqual(100);
      expect(d1).toBeGreaterThanOrEqual(200);
      expect(d2).toBeGreaterThanOrEqual(400);
      expect(dMax).toBeLessThanOrEqual(2000);
    });
  });

  describe('executeWithRetry & provider handling', () => {
    const fastLimiter = new TokenBucketRateLimiter({
      requestsPerMinute: 1000,
      maxConcurrency: 10,
    });

    it('retries on HTTP 429 rate limit error and succeeds on subsequent attempt', async () => {
      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          return new Response('Rate limit exceeded', { status: 429 });
        }
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Success after 429' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const client = new LlmClient({
        apiKey: 'test-key',
        baseDelayMs: 10,
        maxDelayMs: 50,
        maxRetries: 3,
        rateLimiter: fastLimiter,
        fetchFn: mockFetch,
      });

      const result = await client.generateText('Hello');

      expect(result).toBe('Success after 429');
      expect(attempts).toBe(2);
    });

    it('retries on HTTP 503 service unavailable error', async () => {
      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts <= 2) {
          return new Response('Service Unavailable', { status: 503 });
        }
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Recovered from 503' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const client = new LlmClient({
        apiKey: 'test-key',
        baseDelayMs: 10,
        maxDelayMs: 50,
        maxRetries: 3,
        rateLimiter: fastLimiter,
        fetchFn: mockFetch,
      });

      const result = await client.generateText('Test 503');

      expect(result).toBe('Recovered from 503');
      expect(attempts).toBe(3);
    });

    it('throws LlmError when max retries are exhausted', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Service Unavailable', { status: 503 })
      );

      const client = new LlmClient({
        apiKey: 'test-key',
        baseDelayMs: 10,
        maxDelayMs: 20,
        maxRetries: 2,
        rateLimiter: fastLimiter,
        fetchFn: mockFetch,
      });

      await expect(client.generateText('Fail test')).rejects.toThrow(LlmError);
    });

    it('falls back to secondary provider when primary fails and fallback key is set', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('googleapis.com')) {
          // Primary fails
          return new Response('Rate limit', { status: 429 });
        }
        if (url.includes('api.groq.com')) {
          // Secondary fallback succeeds
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: { content: 'Response from Groq fallback' },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not Found', { status: 404 });
      });

      const client = new LlmClient({
        apiKey: 'gemini-key',
        fallbackApiKey: 'groq-key',
        baseDelayMs: 10,
        maxDelayMs: 20,
        maxRetries: 1,
        rateLimiter: fastLimiter,
        fetchFn: mockFetch,
      });

      const result = await client.generateText('Fallback test');
      expect(result).toBe('Response from Groq fallback');
    });

    it('generates structured data validated against Zod schema', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: '```json\n{\n  "title": "Senior Engineer",\n  "years": 5,\n  "skills": ["TypeScript", "Node"]\n}\n```',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const client = new LlmClient({
        apiKey: 'test-key',
        rateLimiter: fastLimiter,
        fetchFn: mockFetch,
      });

      const Schema = z.object({
        title: z.string(),
        years: z.number(),
        skills: z.array(z.string()),
      });

      const parsed = await client.generateStructured('Extract', Schema);
      expect(parsed).toEqual({
        title: 'Senior Engineer',
        years: 5,
        skills: ['TypeScript', 'Node'],
      });
    });
  });
});
