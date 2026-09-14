'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  RotateCcw,
  Layers,
  ArrowRight,
  Sparkles,
  Award,
  CheckCircle2,
} from 'lucide-react';
import type { PracticeStats } from '@/lib/spacedRepetition';

interface QueueCompleteCardProps {
  kitId: string;
  stats: PracticeStats;
  onRestartAll: () => void;
  onRestartNeedsReview: () => void;
}

export function QueueCompleteCard({
  kitId,
  stats,
  onRestartAll,
  onRestartNeedsReview,
}: QueueCompleteCardProps) {
  const needsReviewCount = stats.ratingCounts[1] + stats.ratingCounts[2];

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-8 text-center shadow-lg dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-indigo-600 text-white shadow-md shadow-pink-500/20">
        <Trophy className="h-8 w-8" />
      </div>

      <h2 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
        Session Complete! 🎉
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        You have worked through all flashcards in this review queue. Spaced repetition records have been updated.
      </p>

      {/* Recap Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-400">Coverage</div>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {stats.coveredPercentage}%
          </div>
          <div className="text-[11px] text-slate-400">{stats.coveredCount} / {stats.totalCards}</div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-400">Avg Confidence</div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {stats.averageConfidence.toFixed(1)} <span className="text-xs font-normal">/ 4.0</span>
          </div>
          <div className="text-[11px] text-slate-400">Recall Score</div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-400">Mastered</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {stats.ratingCounts[4]}
          </div>
          <div className="text-[11px] text-slate-400">{stats.masteryPercentage}% of Deck</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {needsReviewCount > 0 && (
          <button
            type="button"
            onClick={onRestartNeedsReview}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-600 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Drill {needsReviewCount} Shaky / Failed Cards</span>
          </button>
        )}

        <button
          type="button"
          onClick={onRestartAll}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Review All Cards Again</span>
        </button>

        <Link
          href={`/kit/${kitId}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
        >
          <span>Return to Builder</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
