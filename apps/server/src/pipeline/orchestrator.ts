import {
  AppendixAKitSchema,
  type AppendixAKit,
  type RoleRequirement,
} from '@repo/shared';
import { LlmClient } from '../llm/client.js';
import { researchCompany, type CompanyResearch } from './steps/02_researchCompany.js';
import { extractRequirements } from './steps/01_extractRequirements.js';
import { generateBrief } from './steps/03_generateBrief.js';
import { generateQuestions } from './steps/04_generateQuestions.js';
import { generateFlashcards } from './steps/05_generateFlashcards.js';
import { ensureCoverage } from './secondPass.js';
import { allocateSchedule } from './deterministic/scheduleEngine.js';

export interface GeneratePrepKitInput {
  /** Raw Job Description text */
  jd: string;
  /** Target company URL */
  companyUrl: string;
  /** Preparation timeline in days (between 1 and 60) */
  days: number;
  /** Allow local URLs (e.g. localhost, 127.0.0.1) during batch evaluation */
  allowLocal?: boolean;
  /** Progress callback reporting each deliberate pipeline phase */
  onProgress?: (status: string) => void;
  /** Optional custom LLM client instance */
  client?: LlmClient;
}

export class PipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineError';
  }
}

/**
 * Master Pipeline Orchestrator.
 * Deliberately executes the multi-step research and generation pipeline with a
 * second-pass deterministic coverage loop, producing a validated Appendix A kit.
 */
export async function generatePrepKit(
  input: GeneratePrepKitInput
): Promise<AppendixAKit> {
  const {
    jd,
    companyUrl,
    days,
    allowLocal = process.env.ALLOW_LOCAL_URLS === 'true',
    onProgress,
    client,
  } = input;

  // 1. Validate input bounds (Section 8: days between 1 and 60)
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new PipelineError(
      `Invalid preparation timeline: ${days} days. Days must be an integer between 1 and 60.`
    );
  }

  if (!jd || typeof jd !== 'string' || jd.trim().length === 0) {
    throw new PipelineError('Job Description cannot be empty.');
  }

  if (!companyUrl || typeof companyUrl !== 'string' || companyUrl.trim().length === 0) {
    throw new PipelineError('Company URL cannot be empty.');
  }

  const llm = client ?? new LlmClient();
  const researchedAt = new Date().toISOString();

  // 2. Step 2: Scrape & crawl company website and public discussions
  onProgress?.('Crawling company site and gathering hiring signals...');
  let research: CompanyResearch;
  try {
    research = await researchCompany(companyUrl, { allowLocal });
  } catch {
    research = {
      companyName: 'Target Company',
      pagesUsed: [],
      companySummaryText: `Unable to access company website at ${companyUrl}.`,
      hiringProcessText: null,
      discussionsText: null,
    };
  }

  // 3. Step 1: Extract role metadata and requirements (anti-hallucination)
  onProgress?.('Extracting role metadata and requirements from Job Description...');
  const role = await extractRequirements(jd, llm);

  // 4. Step 3: Generate honest Company Brief
  onProgress?.('Synthesizing Company Brief and technical domain overview...');
  const brief = await generateBrief(companyUrl, research, llm);

  // 5. Step 4: Categorized Question Generation (Technical, Behavioural, System Design)
  onProgress?.('Generating question bank across technical, behavioural, and system design categories...');
  const initialQuestions = await generateQuestions(
    role,
    brief,
    research.hiringProcessText,
    llm
  );

  // 6. The Second Pass Coverage Loop
  onProgress?.('Executing second-pass coverage verification and closing requirement gaps...');
  const coverageResult = await ensureCoverage(
    role.requirements,
    initialQuestions,
    { roleTitle: role.title, companyName: research.companyName },
    llm,
    2
  );

  const finalQuestions = coverageResult.questions;

  // 7. Step 5: Flashcard Generation
  onProgress?.('Generating high-yield active-recall flashcards...');
  const flashcards = await generateFlashcards(finalQuestions, role, llm);

  // 8. Deterministic Schedule Allocation across exact days
  onProgress?.(`Allocating preparation schedule across ${days} days...`);
  const schedule = allocateSchedule(days, role.requirements, finalQuestions);

  // 9. Assemble Complete Appendix A Kit
  onProgress?.('Assembling and validating Appendix A Preparation Kit...');

  // Extract location from JD if mentioned, otherwise fallback cleanly
  const locationMatch = jd.match(/\b(?:location|located in|based in|office in)\s*:\s*([^\n\r,]+)/i);
  const location = locationMatch ? locationMatch[1].trim() : 'Remote / Unspecified';

  const assembledKit: AppendixAKit = {
    source: {
      company: research.companyName,
      company_url: companyUrl,
      role: role.title,
      location,
      jd_chars: jd.length,
      researched_at: researchedAt,
      pages_used: research.pagesUsed,
    },
    company_brief: brief,
    role,
    questions: finalQuestions,
    flashcards,
    schedule,
    coverage: coverageResult.coverage,
  };

  // 10. Strict Schema Validation against AppendixAKitSchema
  return AppendixAKitSchema.parse(assembledKit);
}
