'use client';

import React from 'react';
import {
  CONFIDENCE_OPTIONS,
  type ConfidenceLevel,
} from '@/lib/spacedRepetition';
import { HelpCircle, AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';

interface ConfidenceRatingButtonsProps {
  currentRating?: ConfidenceLevel;
  onSelectRating: (rating: ConfidenceLevel) => void;
  disabled?: boolean;
}

const ICONS: Record<ConfidenceLevel, React.ReactNode> = {
  1: <HelpCircle className="h-4 w-4" />,
  2: <AlertTriangle className="h-4 w-4" />,
  3: <CheckCircle2 className="h-4 w-4" />,
  4: <Trophy className="h-4 w-4" />,
};

export function ConfidenceRatingButtons({
  currentRating,
  onSelectRating,
  disabled = false,
}: ConfidenceRatingButtonsProps) {
  const levels: ConfidenceLevel[] = [1, 2, 3, 4];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Rate your recall confidence:
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
          Keyboard: [1] [2] [3] [4]
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {levels.map((lvl) => {
          const opt = CONFIDENCE_OPTIONS[lvl];
          const isSelected = currentRating === lvl;

          return (
            <button
              key={lvl}
              type="button"
              disabled={disabled}
              onClick={() => onSelectRating(lvl)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected ? opt.activeClass : opt.buttonClass
              }`}
              title={`Rate as ${opt.label} (Press ${opt.keyLabel})`}
              aria-label={`Rate as ${opt.label}`}
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0">{ICONS[lvl]}</span>
                <span className="font-bold">{opt.label}</span>
              </div>
              <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 group-hover:bg-black/10">
                {opt.keyLabel}
              </kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
