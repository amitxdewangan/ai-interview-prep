import type { RoleRequirement, Question } from '@repo/shared';

export interface CoverageGapResult {
  uncoveredIds: string[];
  mustHaveGaps: string[];
  niceToHaveGaps: string[];
  coveragePercentage: number;
}

/**
 * Deterministically finds coverage gaps between extracted requirements and generated questions.
 *
 * Rules:
 * 1. Collect all requirement IDs covered by the question list.
 * 2. Identify requirement IDs that have zero matching questions.
 * 3. Segregate uncovered IDs into must-have and nice-to-have gaps.
 * 4. Compute deterministic coverage percentage.
 */
export function findCoverageGaps(
  requirements: RoleRequirement[],
  questions: Question[]
): CoverageGapResult {
  const coveredIds = new Set<string>();
  for (const question of questions) {
    if (Array.isArray(question.requirement_ids)) {
      for (const reqId of question.requirement_ids) {
        if (typeof reqId === 'string' && reqId.trim().length > 0) {
          coveredIds.add(reqId.trim());
        }
      }
    }
  }

  const uncoveredIds: string[] = [];
  const mustHaveGaps: string[] = [];
  const niceToHaveGaps: string[] = [];

  for (const req of requirements) {
    if (!coveredIds.has(req.id)) {
      uncoveredIds.push(req.id);
      if (req.priority === 'must') {
        mustHaveGaps.push(req.id);
      } else {
        niceToHaveGaps.push(req.id);
      }
    }
  }

  const totalRequirements = requirements.length;
  const coveredCount = totalRequirements - uncoveredIds.length;
  const coveragePercentage =
    totalRequirements === 0
      ? 100
      : Math.round((coveredCount / totalRequirements) * 100);

  return {
    uncoveredIds,
    mustHaveGaps,
    niceToHaveGaps,
    coveragePercentage,
  };
}
