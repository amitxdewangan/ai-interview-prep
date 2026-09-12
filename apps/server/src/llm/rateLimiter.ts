export interface RateLimiterOptions {
  /** Maximum requests allowed per minute window. Defaults to 15 (Gemini 1.5 Flash free tier limit). */
  requestsPerMinute?: number;
  /** Maximum tokens allowed per minute window. Defaults to 32,000 tokens. */
  tokensPerMinute?: number;
  /** Maximum concurrent in-flight executions. Defaults to 2. */
  maxConcurrency?: number;
  /** Sliding window duration in milliseconds. Defaults to 60,000 ms (1 minute). */
  windowMs?: number;
}

interface QueuedItem<T> {
  task: () => Promise<T>;
  estimatedTokens: number;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

interface RecordedRequest {
  timestamp: number;
  tokens: number;
}

/**
 * Token-Bucket & Concurrency Rate Limiter.
 * Regulates outgoing LLM requests to strictly stay within Requests Per Minute (RPM)
 * and Tokens Per Minute (TPM) limits, smoothing out bursts rather than triggering HTTP 429.
 */
export class TokenBucketRateLimiter {
  private readonly requestsPerMinute: number;
  private readonly tokensPerMinute: number;
  private readonly maxConcurrency: number;
  private readonly windowMs: number;

  private queue: QueuedItem<any>[] = [];
  private history: RecordedRequest[] = [];
  private activeConcurrency = 0;
  private processTimer: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions = {}) {
    this.requestsPerMinute = options.requestsPerMinute ?? 15;
    this.tokensPerMinute = options.tokensPerMinute ?? 32000;
    this.maxConcurrency = options.maxConcurrency ?? 2;
    this.windowMs = options.windowMs ?? 60000;
  }

  /**
   * Enqueues an async task to be executed once concurrency, RPM, and TPM limits permit.
   */
  public async schedule<T>(task: () => Promise<T>, estimatedTokens = 500): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task,
        estimatedTokens,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  /**
   * Cleans up history older than the current sliding window.
   */
  private pruneHistory(now: number): void {
    const cutoff = now - this.windowMs;
    this.history = this.history.filter((entry) => entry.timestamp > cutoff);
  }

  /**
   * Computes the current tokens used in the sliding window.
   */
  private currentTokensInWindow(): number {
    return this.history.reduce((sum, entry) => sum + entry.tokens, 0);
  }

  /**
   * Processes the waiting queue, respecting concurrency and rate limits.
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      if (this.processTimer) {
        clearTimeout(this.processTimer);
        this.processTimer = null;
      }
      return;
    }

    const now = Date.now();
    this.pruneHistory(now);

    // 1. Check concurrency capacity
    if (this.activeConcurrency >= this.maxConcurrency) {
      return;
    }

    const nextItem = this.queue[0];
    if (!nextItem) return;

    // 2. Check RPM capacity
    if (this.history.length >= this.requestsPerMinute) {
      // Find when the oldest entry in history expires
      const oldestEntry = this.history[0];
      const waitTime = Math.max(10, oldestEntry.timestamp + this.windowMs - now);
      this.scheduleRetry(waitTime);
      return;
    }

    // 3. Check TPM capacity
    const tokensUsed = this.currentTokensInWindow();
    if (tokensUsed + nextItem.estimatedTokens > this.tokensPerMinute) {
      const oldestEntry = this.history[0];
      const waitTime = Math.max(10, oldestEntry.timestamp + this.windowMs - now);
      this.scheduleRetry(waitTime);
      return;
    }

    // Ready to run next item
    this.queue.shift();
    this.activeConcurrency++;
    this.history.push({
      timestamp: Date.now(),
      tokens: nextItem.estimatedTokens,
    });

    (async () => {
      try {
        const result = await nextItem.task();
        nextItem.resolve(result);
      } catch (err) {
        nextItem.reject(err);
      } finally {
        this.activeConcurrency--;
        this.processQueue();
      }
    })();

    // Attempt to process another item if concurrency allows
    if (this.activeConcurrency < this.maxConcurrency && this.queue.length > 0) {
      this.processQueue();
    }
  }

  private scheduleRetry(delayMs: number): void {
    if (this.processTimer) return;
    this.processTimer = setTimeout(() => {
      this.processTimer = null;
      this.processQueue();
    }, delayMs);
  }

  /**
   * Returns current telemetry of the rate limiter.
   */
  public getStats(): {
    queueLength: number;
    activeConcurrency: number;
    requestsInWindow: number;
    tokensInWindow: number;
  } {
    this.pruneHistory(Date.now());
    return {
      queueLength: this.queue.length,
      activeConcurrency: this.activeConcurrency,
      requestsInWindow: this.history.length,
      tokensInWindow: this.currentTokensInWindow(),
    };
  }

  /**
   * Clears the queue and resets state.
   */
  public clear(): void {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
    for (const item of this.queue) {
      item.reject(new Error('Rate limiter queue cleared.'));
    }
    this.queue = [];
    this.history = [];
    this.activeConcurrency = 0;
  }
}
