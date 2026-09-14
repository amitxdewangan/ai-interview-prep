'use client';

import React from 'react';
import {
  type PracticeStats as StatsType,
  CONFIDENCE_OPTIONS,
  type ConfidenceLevel,
} from '@/lib/spacedRepetition';
import {
  BarChart3,
  Flame,
  Award,
  RotateCcw,
  CheckCircle2,
  Clock,
  HelpCircle,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

interface PracticeStatsProps {
  stats: StatsType;
  onReset?: () => void;
}

export function PracticeStats({ stats, onReset }: PracticeStatsProps) {
  const {
    totalCards,
    coveredCount,
    coveredPercentage,
    averageConfidence,
    masteryPercentage,
    ratingCounts,
    unseenCount,
  } = stats;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Practice Mastery & Spaced Repetition Stats
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {coveredCount} of {totalCards} cards covered ({coveredPercentage}% deck completion)
            </p>
          </div>
        </div>

        {onReset && coveredCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition"
            title="Reset practice records for this kit"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Stats</span>
          </button>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Coverage */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Coverage</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            {coveredPercentage}%
          </div>
          <p className="text-[11px] text-slate-400">
            {coveredCount} / {totalCards} cards
          </p>
        </div>

        {/* Average Score */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Avg Confidence</span>
            <Flame className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            {averageConfidence.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 4.0</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {averageConfidence >= 3.5 ? 'Mastery Level' : averageConfidence >= 2.5 ? 'Solid Grasp' : 'Review Urgently'}
          </p>
        </div>

        {/* Mastered % */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Mastery</span>
            <Award className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
            {masteryPercentage}%
          </div>
          <p className="text-[11px] text-slate-400">
            {ratingCounts[4]} mastered cards
          </p>
        </div>

        {/* Unseen */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Remaining</span>
            <Clock className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-extrabold text-slate-700 dark:text-slate-300">
            {unseenCount}
          </div>
          <p className="text-[11px] text-slate-400">unseen cards</p>
        </div>
      </div>

      {/* Multi-segment Progress Bar */}
      <div className="mt-4">
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          {totalCards > 0 && (
            <>
              <div
                style={{ width: `${(ratingCounts[4] / totalCards) * 100}%` }}
                className="bg-emerald-500 transition-all duration-300"
                title={`Mastered: ${ratingCounts[4]}`}
              />
              <div
                style={{ width: `${(ratingCounts[3] / totalCards) * 100}%` }}
                className="bg-blue-500 transition-all duration-300"
                title={`Confident: ${ratingCounts[3]}`}
              />
              <div
                style={{ width: `${(ratingCounts[2] / totalCards) * 100}%` }}
                className="bg-amber-400 transition-all duration-300"
                title={`Shaky: ${ratingCounts[2]}`}
              />
              <div
                style={{ width: `${(ratingCounts[1] / totalCards) * 100}%` }}
                className="bg-rose-500 transition-all duration-300"
                title={`Don't Know: ${ratingCounts[1]}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Rating Pills Breakdown */}
      <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
          <Trophy className="h-3 w-3" />
          <span>Mastered: {ratingCounts[4]}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
          <CheckCircle2 className="h-3 w-3" />
          <span>Confident: {ratingCounts[3]}</span>
        </div>
        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
          <AlertTriangle className="h-3 w-3" />
          <span>Shaky: {ratingCounts[2]}</span>
        </div>
        <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-medium">
          <HelpCircle className="h-3 w-3" />
          <span>Don't Know: {ratingCounts[1]}</span>
        </div>
      </div>
    </div>
  );
}
