import { z } from 'zod';
import {
  QuestionSchema,
  type Question,
  type QuestionCategory,
  type Role,
  type CompanyBrief,
  type RoleRequirement,
} from '@repo/shared';
import { LlmClient } from '../../llm/client.js';

const CategoryQuestionsOutputSchema = z.array(
  z.object({
    requirement_ids: z.array(z.string()),
    category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
    prompt: z.string(),
    answer_outline: z.string(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
);

export type CategoryQuestionDraft = z.infer<typeof CategoryQuestionsOutputSchema>[number];

export async function generateCategoryQuestionsDrafts(
  category: QuestionCategory,
  role: Role,
  brief: CompanyBrief,
  hiringProcessText: string | null,
  client?: LlmClient
): Promise<CategoryQuestionDraft[]> {
  const llm = client ?? new LlmClient();
  const techReqs = role.requirements.filter((r) => r.kind === 'technical');
  const behavReqs = role.requirements.filter((r) => r.kind === 'behavioural');
  const domainReqs = role.requirements.filter((r) => r.kind === 'domain');

  // =========================================================================
  // Category: Technical Questions (Coding, Architecture, Debugging)
  // =========================================================================
  if (category === 'technical') {
    const techTargets = techReqs.length > 0 ? techReqs : role.requirements;
    const techPrompt = `You are a Principal Software Engineer conducting technical interviews for the ${role.title} (${role.seniority}) role at ${brief.summary}.

Target Technical Requirements to Cover:
${formatReqsForPrompt(techTargets)}

Task:
Generate 3 to 5 realistic, deep technical interview questions (coding, problem solving, or debugging) directly assessing these requirements.
For each question, specify:
- "requirement_ids": array of target requirement IDs tested (e.g. ["${techTargets[0]?.id || 'r1'}"])
- "category": strictly "technical"
- "prompt": the direct interview question or coding problem statement
- "answer_outline": concrete bullet points of what a high-bar answer must demonstrate
- "difficulty": integer 1 (Junior/Foundational), 2 (Mid/Senior standard), or 3 (Staff/Advanced edge cases)

Return a JSON array matching the schema.`;

    try {
      return await llm.generateStructured(techPrompt, CategoryQuestionsOutputSchema, {
        systemInstruction:
          'You are a senior technical interviewer. Generate rigorous, non-trivial coding and technical interview questions linked to specific requirement IDs.',
        temperature: 0.2,
      });
    } catch {
      // If call fails, synthesize minimal questions from requirements
      return fallbackQuestionsForReqs(techTargets, 'technical');
    }
  }

  // =========================================================================
  // Category: Behavioural & Culture Fit Questions (STAR method, leadership)
  // =========================================================================
  if (category === 'behavioural' || category === 'company-fit') {
    const behavTargets = behavReqs.length > 0 ? behavReqs : role.requirements.slice(0, 2);
    const targetCat = category === 'company-fit' ? 'company-fit' : 'behavioural';
    const behavPrompt = `You are an Engineering Director conducting behavioural and culture-fit interviews for ${role.title} at ${brief.summary}.

Company Context:
${brief.what_they_do}

Target Behavioural Requirements:
${formatReqsForPrompt(behavTargets)}

Task:
Generate 2 to 3 behavioural situational questions (using the STAR method: Situation, Task, Action, Result) evaluating collaboration, conflict resolution, and leadership.
For each question:
- "requirement_ids": array of linked requirement IDs
- "category": strictly "${targetCat}"
- "prompt": the situational question (e.g., "Tell me about a time...")
- "answer_outline": what great vs weak candidates say (STAR structure)
- "difficulty": integer 1, 2, or 3

Return a JSON array matching the schema.`;

    try {
      const results = await llm.generateStructured(behavPrompt, CategoryQuestionsOutputSchema, {
        systemInstruction:
          'You are a hiring manager. Generate insightful behavioural questions using the STAR framework linked to requirement IDs.',
        temperature: 0.3,
      });
      return results.map((r) => ({ ...r, category: targetCat }));
    } catch {
      // If call fails, synthesize minimal questions from requirements
      return fallbackQuestionsForReqs(behavTargets, targetCat);
    }
  }

  // =========================================================================
  // Category: System Design & Domain Questions (Scalability, Architecture)
  // =========================================================================
  const domainTargets =
    domainReqs.length > 0
      ? domainReqs
      : techReqs.filter((r) => r.priority === 'must').length > 0
        ? techReqs.filter((r) => r.priority === 'must')
        : role.requirements;

  const hiringSignals = hiringProcessText
    ? `Discovered Hiring Signals:\n${hiringProcessText.slice(0, 2000)}`
    : 'Standard distributed systems & domain architecture round.';

  const designPrompt = `You are a Systems Architect evaluating ${role.title} candidates for ${brief.summary}.

Hiring Process Context:
${hiringSignals}

Target Requirements:
${formatReqsForPrompt(domainTargets)}

Task:
Generate 2 to 3 system design or domain scalability questions tailored to the company's stack and business model.
For each question:
- "requirement_ids": array of linked requirement IDs
- "category": strictly "system-design" or "domain-specific"
- "prompt": system design scenario or domain specific and architectural challenge
- "answer_outline": key components, trade-offs, bottlenecks, and data flow
- "difficulty": integer 2 or 3

Return a JSON array matching the schema.`;

  try {
    return await llm.generateStructured(designPrompt, CategoryQuestionsOutputSchema, {
      systemInstruction:
        'You are a systems design and domain specific interviewer. Generate realistic architecture and domain specific design challenges and questions linked to requirement IDs.',
      temperature: 0.2,
    });
  } catch {
    // If call fails, synthesize minimal questions from requirements
    return fallbackQuestionsForReqs(domainTargets, 'system-design');
  }
}

/**
 * Step 4: Deliberate multi-step question generator.
 * Employs separate targeted prompts for Technical, Behavioural, and System Design/Domain categories
 * rather than a single mega-prompt, ensuring high question depth and faithful requirement mapping.
 */
export async function generateQuestions(
  role: Role,
  brief: CompanyBrief,
  hiringProcessText: string | null,
  client?: LlmClient
): Promise<Question[]> {
  const llm = client ?? new LlmClient();
  const validReqIds = new Set(role.requirements.map((r) => r.id));

  const allDrafts: CategoryQuestionDraft[] = [];

  // =========================================================================
  // CALL A: Technical Questions (Coding, Architecture, Debugging)
  // =========================================================================
  const techDrafts = await generateCategoryQuestionsDrafts('technical', role, brief, hiringProcessText, llm);
  allDrafts.push(...techDrafts);

  // =========================================================================
  // CALL B: Behavioural & Culture Fit Questions (STAR method, leadership)
  // =========================================================================
  const behavDrafts = await generateCategoryQuestionsDrafts('behavioural', role, brief, hiringProcessText, llm);
  allDrafts.push(...behavDrafts);

  // =========================================================================
  // CALL C: System Design & Domain Questions (Scalability, Architecture)
  // =========================================================================
  const designDrafts = await generateCategoryQuestionsDrafts('system-design', role, brief, hiringProcessText, llm);
  allDrafts.push(...designDrafts);

  // =========================================================================
  // Assembly & ID Normalization (q1, q2, ...)
  // =========================================================================
  const normalizedQuestions: Question[] = allDrafts.map((draft, idx) => {
    // Sanitize requirement IDs: keep only IDs that actually exist in role.requirements
    let cleanReqIds = draft.requirement_ids.filter((id) => validReqIds.has(id));
    if (cleanReqIds.length === 0 && role.requirements.length > 0) {
      // If none matched, assign to the first requirement
      cleanReqIds = [role.requirements[0].id];
    }

    return {
      id: `q${idx + 1}`,
      requirement_ids: cleanReqIds,
      category: draft.category,
      prompt: draft.prompt.trim(),
      answer_outline: draft.answer_outline.trim(),
      difficulty: draft.difficulty,
    };
  });

  return z.array(QuestionSchema).parse(normalizedQuestions);
}

function formatReqsForPrompt(reqs: RoleRequirement[]): string {
  if (reqs.length === 0) return 'None specified.';
  return reqs
    .map(
      (r) =>
        `- [${r.id}] (${r.priority.toUpperCase()} | ${r.kind}): ${r.text}`
    )
    .join('\n');
}

function fallbackQuestionsForReqs(
  reqs: RoleRequirement[],
  category: QuestionCategory
): CategoryQuestionDraft[] {
  return reqs.map((r, i) => ({
    requirement_ids: [r.id],
    category,
    prompt: `How would you demonstrate proficiency in ${r.text}? Explain your approach and architectural choices.`,
    answer_outline: `Discuss deep practical experience with ${r.text}, trade-offs, performance implications, and real-world failure modes.`,
    difficulty: ((i % 3) + 1) as 1 | 2 | 3,
  }));
}
