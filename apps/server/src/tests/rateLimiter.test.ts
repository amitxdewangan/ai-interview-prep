import { describe, it, expect, vi } from 'vitest';
import { TokenBucketRateLimiter } from '../llm/rateLimiter.js';

describe('Phase 3: TokenBucketRateLimiter', () => {
  it('executes tasks asynchronously and returns results', async () => {
    const limiter = new TokenBucketRateLimiter({
      requestsPerMinute: 60,
      maxConcurrency: 2,
    });

    const result = await limiter.schedule(async () => {
      return 42;
    });

    expect(result).toBe(42);
  });

  it('enforces concurrency limit and executes queued tasks as slots free up', async () => {
    const limiter = new TokenBucketRateLimiter({
      requestsPerMinute: 60,
      maxConcurrency: 2,
    });

    let runningCount = 0;
    let maxObservedConcurrency = 0;

    const createTask = (delayMs: number) => {
      return limiter.schedule(async () => {
        runningCount++;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, runningCount);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        runningCount--;
        return true;
      });
    };

    const tasks = [
      createTask(30),
      createTask(30),
      createTask(30),
      createTask(30),
    ];

    await Promise.all(tasks);

    expect(maxObservedConcurrency).toBeLessThanOrEqual(2);
  });

  it('paces requests to stay within requestsPerMinute limit', async () => {
    // Window: 200ms, max 2 requests per 200ms window
    const limiter = new TokenBucketRateLimiter({
      requestsPerMinute: 2,
      windowMs: 200,
      maxConcurrency: 5,
    });

    const startTime = Date.now();
    const results = await Promise.all([
      limiter.schedule(async () => 1),
      limiter.schedule(async () => 2),
      limiter.schedule(async () => 3), // Should be delayed until window passes
    ]);

    const duration = Date.now() - startTime;
    expect(results).toEqual([1, 2, 3]);
    expect(duration).toBeGreaterThanOrEqual(180);
  });

  it('rejects queued items when cleared', async () => {
    const limiter = new TokenBucketRateLimiter({
      requestsPerMinute: 1,
      windowMs: 5000,
      maxConcurrency: 1,
    });

    // Start one long task
    const p1 = limiter.schedule(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    // Queue second task
    const p2 = limiter.schedule(async () => 'never');

    limiter.clear();

    await expect(p2).rejects.toThrow('Rate limiter queue cleared');
    await p1;
  });
});
