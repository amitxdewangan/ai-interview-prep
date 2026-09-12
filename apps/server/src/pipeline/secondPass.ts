import { z } from 'zod';
import type { RoleRequirement, Question } from '@repo/shared';
import { findCoverageGaps } from './deterministic/coverageEngine.js';
import { LlmClient } from '../llm/client.js';

export interface SecondPassContext {
  roleTitle?: string;
  companyName?: string;
}

export interface SecondPassResult {
  questions: Question[];
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
}

const GapFillQuestionsOutputSchema = z.array(
  z.object({
    requirement_ids: z.array(z.string()),
    category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
    prompt: z.string(),
    answer_outline: z.string(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
);

const GAP_FILL_SYSTEM_INSTRUCTION = `You are a Principal Engineering Interviewer specializing in candidate assessment coverage.
A deterministic coverage gap check identified critical role requirements that have NO matching interview questions.
Your sole job is to generate targeted, high-signal interview questions addressing these exact missing requirements so that 100% must-have coverage is achieved.`;

/**
 * Step 4 Loop: Second-Pass Coverage Loop.
 * Deterministically detects uncovered must-have requirements using findCoverageGaps.
 * If gaps exist and passes < maxPasses, generates targeted questions to close the gaps,
 * re-checks coverage, and records the passes count and any remaining uncovered IDs.
 */
export async function ensureCoverage(
  requirements: RoleRequirement[],
  initialQuestions: Question[],
  context: SecondPassContext = {},
  client?: LlmClient,
  maxPasses = 2
): Promise<SecondPassResult> {
  const llm = client ?? new LlmClient();
  const roleTitle = context.roleTitle ?? 'Software Engineer';
  const companyName = context.companyName ?? 'Target Company';

  const currentQuestions: Question[] = [...initialQuestions];
  let passes = 1;

  // Pass 1 deterministic gap check
  let gaps = findCoverageGaps(requirements, currentQuestions);

  while (passes < maxPasses && gaps.mustHaveGaps.length > 0) {
    // Collect the missing must-have requirements to generate questions for
    const missingReqs = requirements.filter((r) =>
      gaps.mustHaveGaps.includes(r.id)
    );

    const missingReqsFormatted = missingReqs
      .map((r) => `- [${r.id}] (${r.priority.toUpperCase()} | ${r.kind}): ${r.text}`)
      .join('\n');

    const prompt = `Role: ${roleTitle} at ${companyName}

The following critical must-have requirements currently have ZERO interview questions in the candidate preparation kit:
${missingReqsFormatted}

Task:
Generate targeted interview questions (1 to 2 questions per missing requirement) specifically testing these uncovered skills.
For each question:
- "requirement_ids": MUST include the specific requirement ID being tested (e.g. ["${missingReqs[0]?.id || 'r1'}"])
- "category": choose the most appropriate category ("technical", "behavioural", "system-design", or "company-fit") based on the requirement kind
- "prompt": the direct, rigorous interview question
- "answer_outline": key points a strong candidate must hit
- "difficulty": integer 1, 2, or 3

Return a JSON array matching the schema.`;

    let newQuestionsDraft: z.infer<typeof GapFillQuestionsOutputSchema> = [];

    try {
      newQuestionsDraft = await llm.generateStructured(
        prompt,
        GapFillQuestionsOutputSchema,
        {
          systemInstruction: GAP_FILL_SYSTEM_INSTRUCTION,
          temperature: 0.2,
        }
      );
    } catch {
      // Fallback: Synthesize deterministic questions for missing must-haves
      newQuestionsDraft = missingReqs.map((r, idx) => ({
        requirement_ids: [r.id],
        category: r.kind === 'behavioural' ? 'behavioural' : 'technical',
        prompt: `How have you applied ${r.text} in past production systems? Provide a concrete example and technical decisions.`,
        answer_outline: `Detailed explanation of practical application of ${r.text}, trade-offs, and lessons learned.`,
        difficulty: ((idx % 3) + 1) as 1 | 2 | 3,
      }));
    }

    // Append newly generated questions with stable non-colliding sequential IDs
    for (const draft of newQuestionsDraft) {
      const nextId = `q${currentQuestions.length + 1}`;
      currentQuestions.push({
        id: nextId,
        requirement_ids: draft.requirement_ids.filter((id) =>
          requirements.some((r) => r.id === id)
        ),
        category: draft.category,
        prompt: draft.prompt.trim(),
        answer_outline: draft.answer_outline.trim(),
        difficulty: draft.difficulty,
      });
    }

    passes++;
    // Re-run deterministic coverage check on combined question list
    gaps = findCoverageGaps(requirements, currentQuestions);
  }

  return {
    questions: currentQuestions,
    coverage: {
      uncovered_requirement_ids: gaps.uncoveredIds,
      passes,
    },
  };
}
