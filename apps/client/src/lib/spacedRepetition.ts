import type { Flashcard } from '@repo/shared';

export type ConfidenceLevel = 1 | 2 | 3 | 4;

export type PracticeFilter = 'all' | 'needs_review' | 'unseen' | 'mastered';

export interface CardReviewRecord {
  cardId: string;
  confidence: ConfidenceLevel;
  reviewedAt: number; // Unix timestamp in ms
  timesReviewed: number;
}

export interface PracticeStorageState {
  records: Record<string, CardReviewRecord>;
  lastReviewedAt?: number;
}

export interface PracticeStats {
  totalCards: number;
  coveredCount: number;
  coveredPercentage: number;
  averageConfidence: number;
  masteryPercentage: number;
  ratingCounts: Record<ConfidenceLevel, number>;
  unseenCount: number;
}

export interface ConfidenceOption {
  level: ConfidenceLevel;
  label: string;
  keyLabel: string;
  badgeClass: string;
  buttonClass: string;
  activeClass: string;
  iconColor: string;
}

export const CONFIDENCE_OPTIONS: Record<ConfidenceLevel, ConfidenceOption> = {
  1: {
    level: 1,
    label: "Don't Know",
    keyLabel: '1',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900',
    buttonClass:
      'border-rose-200 hover:border-rose-400 hover:bg-rose-50/70 text-rose-700 dark:border-rose-900/60 dark:hover:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40',
    activeClass:
      'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-500',
    iconColor: '#f43f5e',
  },
  2: {
    level: 2,
    label: 'Shaky',
    keyLabel: '2',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900',
    buttonClass:
      'border-amber-200 hover:border-amber-400 hover:bg-amber-50/70 text-amber-700 dark:border-amber-900/60 dark:hover:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40',
    activeClass:
      'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-500',
    iconColor: '#f59e0b',
  },
  3: {
    level: 3,
    label: 'Confident',
    keyLabel: '3',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900',
    buttonClass:
      'border-blue-200 hover:border-blue-400 hover:bg-blue-50/70 text-blue-700 dark:border-blue-900/60 dark:hover:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/40',
    activeClass:
      'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-500',
    iconColor: '#3b82f6',
  },
  4: {
    level: 4,
    label: 'Mastered',
    keyLabel: '4',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900',
    buttonClass:
      'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/60 dark:hover:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40',
    activeClass:
      'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-500',
    iconColor: '#10b981',
  },
};

/**
 * Priority scoring for spaced repetition queue:
 * Unseen cards (no record) receive priority 0 (reviewed first).
 * Rated cards receive their confidence score (1, 2, 3, 4).
 * Cards with the same score are broken by least recently reviewed (earlier timestamp first).
 */
export function sortReviewQueue(
  flashcards: Flashcard[],
  records: Record<string, CardReviewRecord>
): Flashcard[] {
  return [...flashcards].sort((a, b) => {
    const recA = records[a.id];
    const recB = records[b.id];

    const scoreA = recA ? recA.confidence : 0;
    const scoreB = recB ? recB.confidence : 0;

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    const timeA = recA?.reviewedAt ?? 0;
    const timeB = recB?.reviewedAt ?? 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return a.id.localeCompare(b.id);
  });
}

/**
 * Filter flashcard queue based on selected study mode.
 */
export function filterReviewQueue(
  flashcards: Flashcard[],
  records: Record<string, CardReviewRecord>,
  filter: PracticeFilter
): Flashcard[] {
  const sorted = sortReviewQueue(flashcards, records);

  switch (filter) {
    case 'needs_review':
      // Return cards scored 1 (Don't Know) or 2 (Shaky)
      return sorted.filter((card) => {
        const rec = records[card.id];
        return rec && (rec.confidence === 1 || rec.confidence === 2);
      });

    case 'unseen':
      // Return cards never reviewed
      return sorted.filter((card) => !records[card.id]);

    case 'mastered':
      // Return cards mastered (confidence 4)
      return sorted.filter((card) => records[card.id]?.confidence === 4);

    case 'all':
    default:
      return sorted;
  }
}

/**
 * Compute real-time practice stats and progress breakdown.
 */
export function calculatePracticeStats(
  flashcards: Flashcard[],
  records: Record<string, CardReviewRecord>
): PracticeStats {
  const totalCards = flashcards.length;
  let coveredCount = 0;
  let totalScore = 0;

  const ratingCounts: Record<ConfidenceLevel, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };

  for (const card of flashcards) {
    const rec = records[card.id];
    if (rec) {
      coveredCount++;
      totalScore += rec.confidence;
      ratingCounts[rec.confidence]++;
    }
  }

  const coveredPercentage = totalCards > 0 ? Math.round((coveredCount / totalCards) * 100) : 0;
  const averageConfidence = coveredCount > 0 ? Number((totalScore / coveredCount).toFixed(1)) : 0;
  const masteryPercentage = totalCards > 0 ? Math.round((ratingCounts[4] / totalCards) * 100) : 0;
  const unseenCount = totalCards - coveredCount;

  return {
    totalCards,
    coveredCount,
    coveredPercentage,
    averageConfidence,
    masteryPercentage,
    ratingCounts,
    unseenCount,
  };
}

/**
 * LocalStorage helpers for practice session persistence
 */
const STORAGE_PREFIX = 'prepkit_practice_';

export function getPracticeStorageKey(kitId: string): string {
  return `${STORAGE_PREFIX}${kitId}`;
}

export function loadPracticeState(kitId: string): PracticeStorageState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { records: {} };
  }

  try {
    const raw = window.localStorage.getItem(getPracticeStorageKey(kitId));
    if (!raw) return { records: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.records === 'object') {
      return parsed;
    }
    return { records: {} };
  } catch {
    return { records: {} };
  }
}

export function savePracticeState(kitId: string, state: PracticeStorageState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(getPracticeStorageKey(kitId), JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save practice state to localStorage:', err);
  }
}

export function clearPracticeState(kitId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(getPracticeStorageKey(kitId));
  } catch (err) {
    console.warn('Failed to clear practice state from localStorage:', err);
  }
}
