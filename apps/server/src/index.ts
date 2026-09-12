import { AppendixAKit, AppendixAKitSchema } from '@repo/shared';

export function validateKit(data: unknown): AppendixAKit {
  return AppendixAKitSchema.parse(data);
}

export * from './security/ssrf.js';
export * from './scraper/htmlCleaner.js';
export * from './scraper/crawler.js';
export * from './scraper/discussions.js';
export * from './pipeline/deterministic/coverageEngine.js';
export * from './pipeline/deterministic/scheduleEngine.js';
export * from './llm/rateLimiter.js';
export * from './llm/jsonParser.js';
export * from './llm/client.js';
