import { describe, it, expect, beforeEach } from 'vitest';
import type { Flashcard } from '@repo/shared';
import {
  sortReviewQueue,
  filterReviewQueue,
  calculatePracticeStats,
  loadPracticeState,
  savePracticeState,
  clearPracticeState,
  type CardReviewRecord,
} from '../lib/spacedRepetition';

const mockCards: Flashcard[] = [
  { id: 'f1', front: 'Concept 1', back: 'Answer 1', requirement_ids: ['r1'] },
  { id: 'f2', front: 'Concept 2', back: 'Answer 2', requirement_ids: ['r2'] },
  { id: 'f3', front: 'Concept 3', back: 'Answer 3', requirement_ids: ['r3'] },
  { id: 'f4', front: 'Concept 4', back: 'Answer 4', requirement_ids: ['r1', 'r2'] },
];

describe('Phase 10: Spaced Repetition Algorithm & Review Queue', () => {
  describe('sortReviewQueue', () => {
    it('sorts unseen cards (priority 0) first, followed by lowest confidence', () => {
      const records: Record<string, CardReviewRecord> = {
        f1: { cardId: 'f1', confidence: 4, reviewedAt: 1000, timesReviewed: 1 },
        f2: { cardId: 'f2', confidence: 2, reviewedAt: 1000, timesReviewed: 1 },
        f3: { cardId: 'f3', confidence: 1, reviewedAt: 1000, timesReviewed: 1 },
        // f4 is unseen
      };

      const sorted = sortReviewQueue(mockCards, records);
      expect(sorted.map((c) => c.id)).toEqual(['f4', 'f3', 'f2', 'f1']);
    });

    it('breaks ties using least recently reviewed timestamp (oldest first)', () => {
      const records: Record<string, CardReviewRecord> = {
        f1: { cardId: 'f1', confidence: 2, reviewedAt: 5000, timesReviewed: 1 }, // more recent
        f2: { cardId: 'f2', confidence: 2, reviewedAt: 1000, timesReviewed: 1 }, // older -> reviewed first
        f3: { cardId: 'f3', confidence: 3, reviewedAt: 2000, timesReviewed: 1 },
        f4: { cardId: 'f4', confidence: 3, reviewedAt: 1000, timesReviewed: 1 }, // older -> reviewed first
      };

      const sorted = sortReviewQueue(mockCards, records);
      expect(sorted.map((c) => c.id)).toEqual(['f2', 'f1', 'f4', 'f3']);
    });
  });

  describe('filterReviewQueue', () => {
    const records: Record<string, CardReviewRecord> = {
      f1: { cardId: 'f1', confidence: 1, reviewedAt: 1000, timesReviewed: 1 },
      f2: { cardId: 'f2', confidence: 2, reviewedAt: 2000, timesReviewed: 1 },
      f3: { cardId: 'f3', confidence: 4, reviewedAt: 3000, timesReviewed: 1 },
      // f4 unseen
    };

    it('returns all cards when filter is "all"', () => {
      const result = filterReviewQueue(mockCards, records, 'all');
      expect(result.length).toBe(4);
    });

    it('returns only cards with confidence 1 (Don\'t Know) or 2 (Shaky) when filter is "needs_review"', () => {
      const result = filterReviewQueue(mockCards, records, 'needs_review');
      expect(result.map((c) => c.id)).toEqual(['f1', 'f2']);
    });

    it('returns only unrated cards when filter is "unseen"', () => {
      const result = filterReviewQueue(mockCards, records, 'unseen');
      expect(result.map((c) => c.id)).toEqual(['f4']);
    });

    it('returns only cards with confidence 4 when filter is "mastered"', () => {
      const result = filterReviewQueue(mockCards, records, 'mastered');
      expect(result.map((c) => c.id)).toEqual(['f3']);
    });
  });

  describe('calculatePracticeStats', () => {
    it('correctly calculates metrics for a partially reviewed deck', () => {
      const records: Record<string, CardReviewRecord> = {
        f1: { cardId: 'f1', confidence: 1, reviewedAt: 1000, timesReviewed: 1 },
        f2: { cardId: 'f2', confidence: 3, reviewedAt: 2000, timesReviewed: 1 },
        f3: { cardId: 'f3', confidence: 4, reviewedAt: 3000, timesReviewed: 1 },
        // f4 unseen
      };

      const stats = calculatePracticeStats(mockCards, records);
      expect(stats.totalCards).toBe(4);
      expect(stats.coveredCount).toBe(3);
      expect(stats.unseenCount).toBe(1);
      expect(stats.coveredPercentage).toBe(75); // 3 / 4 = 75%
      expect(stats.averageConfidence).toBe(2.7); // (1 + 3 + 4) / 3 = 8 / 3 ≈ 2.666 -> 2.7
      expect(stats.masteryPercentage).toBe(25); // 1 / 4 = 25%
      expect(stats.ratingCounts[1]).toBe(1);
      expect(stats.ratingCounts[2]).toBe(0);
      expect(stats.ratingCounts[3]).toBe(1);
      expect(stats.ratingCounts[4]).toBe(1);
    });

    it('returns 0 values when deck is completely unseen', () => {
      const stats = calculatePracticeStats(mockCards, {});
      expect(stats.totalCards).toBe(4);
      expect(stats.coveredCount).toBe(0);
      expect(stats.unseenCount).toBe(4);
      expect(stats.coveredPercentage).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.masteryPercentage).toBe(0);
    });
  });

  describe('localStorage persistence', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('saves and reloads practice state from localStorage', () => {
      const testState = {
        records: {
          f1: { cardId: 'f1', confidence: 3 as const, reviewedAt: 12345, timesReviewed: 2 },
        },
        lastReviewedAt: 12345,
      };

      savePracticeState('kit-abc', testState);
      const loaded = loadPracticeState('kit-abc');
      expect(loaded.records.f1.confidence).toBe(3);
      expect(loaded.records.f1.timesReviewed).toBe(2);

      clearPracticeState('kit-abc');
      const cleared = loadPracticeState('kit-abc');
      expect(cleared.records).toEqual({});
    });
  });
});
