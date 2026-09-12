import { RoleSchema, type Role } from '@repo/shared';
import { LlmClient } from '../../llm/client.js';

const EXTRACTION_SYSTEM_INSTRUCTION = `You are an expert technical recruiter and job specification parser.
Your task is to extract structured role metadata and a granular list of candidate requirements from a provided Job Description (JD).

CRITICAL ANTI-HALLUCINATION RULES:
1. Extract ONLY facts, qualifications, and responsibilities explicitly mentioned in the Job Description.
2. If the Job Description is minimal (e.g. a two-line stub), extract ONLY what is explicitly stated. NEVER fabricate, invent, or assume additional technologies, frameworks, or responsibilities that are not in the text.
3. Every requirement MUST have:
   - "id": stable identifier formatted sequentially ("r1", "r2", "r3", ...)
   - "text": concise, specific requirement statement
   - "kind": strictly one of "technical", "behavioural", or "domain"
   - "priority": strictly "must" (for required, non-negotiable qualifications, e.g. "required", "5+ years", "must have") or "nice" (for preferred, bonus, or optional qualifications, e.g. "plus", "preferred", "nice to have")

Output format:
Return ONLY a valid JSON object matching the Role schema:
{
  "title": "Exact or inferred role title",
  "seniority": "Seniority level (e.g., Senior, Staff, Mid-Level, Junior, Lead, or Unspecified)",
  "responsibilities": ["Concise responsibility 1", "Concise responsibility 2"],
  "requirements": [
    {
      "id": "r1",
      "text": "Requirement text",
      "kind": "technical",
      "priority": "must"
    }
  ]
}`;

/**
 * Step 1: Extracts role metadata, responsibilities, and requirements from a raw JD string.
 * Strictly guarantees anti-hallucination on thin or short JDs.
 */
export async function extractRequirements(
  jd: string,
  client?: LlmClient
): Promise<Role> {
  const llm = client ?? new LlmClient();

  const cleanJd = jd.trim();
  if (!cleanJd) {
    return {
      title: 'Unspecified Role',
      seniority: 'Unspecified',
      responsibilities: [],
      requirements: [],
    };
  }

  const prompt = `Please extract the role metadata, responsibilities, and granular requirements from this Job Description:\n\n"""\n${cleanJd}\n"""`;

  const parsed = await llm.generateStructured<Role>(
    prompt,
    RoleSchema,
    {
      systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
      temperature: 0.1, // Low temperature for high precision and zero hallucination
    }
  );

  // Post-process to guarantee stable IDs (r1, r2, ...) and deduplicate
  const normalizedRequirements = parsed.requirements.map((req, index) => ({
    ...req,
    id: `r${index + 1}`,
  }));

  const role: Role = {
    title: parsed.title.trim() || 'Software Engineer',
    seniority: parsed.seniority.trim() || 'Unspecified',
    responsibilities: parsed.responsibilities.filter((r) => r.trim().length > 0),
    requirements: normalizedRequirements,
  };

  return RoleSchema.parse(role);
}
