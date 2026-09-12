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
export * from './pipeline/steps/01_extractRequirements.js';
export * from './pipeline/steps/02_researchCompany.js';
export * from './pipeline/steps/03_generateBrief.js';
export * from './pipeline/steps/04_generateQuestions.js';
export * from './pipeline/steps/05_generateFlashcards.js';
