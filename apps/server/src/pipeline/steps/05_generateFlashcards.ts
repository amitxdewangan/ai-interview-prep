import { z } from 'zod';
import {
  FlashcardSchema,
  type Flashcard,
  type Question,
  type Role,
} from '@repo/shared';
import { LlmClient } from '../../llm/client.js';

const DraftFlashcardArraySchema = z.array(
  z.object({
    front: z.string(),
    back: z.string(),
    requirement_ids: z.array(z.string()),
  })
);

const FLASHCARD_SYSTEM_INSTRUCTION = `You are a technical study coach creating high-yield active-recall flashcards for interview candidates.

TASK:
Generate 6 to 12 flashcards covering core technical concepts, system design principles, and behavioural frameworks from the provided questions and requirements.

RULES:
1. "front": A bite-sized concept, code challenge snippet, or architectural question.
2. "back": A crisp, high-yield explanation, key trade-off, or practical bullet points (under 80 words).
3. "requirement_ids": Array of associated requirement IDs (e.g. ["r1"]).
4. Ensure each card tests one clear, atomic concept.

Output format:
Return ONLY a valid JSON array matching the Flashcard schema:
[
  {
    "front": "What is the difference between optimistic and pessimistic locking in distributed databases?",
    "back": "Optimistic assumes low collision, verifies version on commit. Pessimistic locks records upfront, preventing concurrent writes at the cost of lower throughput.",
    "requirement_ids": ["r1"]
  }
]`;

/**
 * Step 4: Generates high-yield study flashcards linked to role requirements.
 */
export async function generateFlashcards(
  questions: Question[],
  role: Role,
  client?: LlmClient
): Promise<Flashcard[]> {
  const llm = client ?? new LlmClient();
  const validReqIds = new Set(role.requirements.map((r) => r.id));

  const questionsContext = questions
    .slice(0, 10)
    .map((q) => `[${q.id}] (${q.category}): ${q.prompt}`)
    .join('\n');

  const reqsContext = role.requirements
    .map((r) => `[${r.id}] ${r.text}`)
    .join('\n');

  const prompt = `Generate active-recall flashcards for candidate preparation based on these requirements and questions:\n\nRequirements:\n${reqsContext}\n\nQuestions:\n${questionsContext}`;

  let drafts: Array<{ front: string; back: string; requirement_ids: string[] }> = [];

  try {
    drafts = await llm.generateStructured(
      prompt,
      DraftFlashcardArraySchema,
      {
        systemInstruction: FLASHCARD_SYSTEM_INSTRUCTION,
        temperature: 0.3,
      }
    );
  } catch {
    // Fallback: Generate cards directly from requirements if LLM call fails
    drafts = role.requirements.map((r) => ({
      front: `Core concepts and best practices for: ${r.text}`,
      back: `Understand fundamental trade-offs, architecture patterns, performance implications, and practical implementation for ${r.text}.`,
      requirement_ids: [r.id],
    }));
  }

  // Normalize IDs to f1, f2, ... and sanitize requirement_ids
  const normalized: Flashcard[] = drafts.map((draft, idx) => {
    let cleanReqIds = draft.requirement_ids.filter((id) => validReqIds.has(id));
    if (cleanReqIds.length === 0 && role.requirements.length > 0) {
      cleanReqIds = [role.requirements[0].id];
    }

    return {
      id: `f${idx + 1}`,
      front: draft.front.trim(),
      back: draft.back.trim(),
      requirement_ids: cleanReqIds,
    };
  });

  return z.array(FlashcardSchema).parse(normalized);
}
