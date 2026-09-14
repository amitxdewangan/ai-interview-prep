'use client';

import React from 'react';
import type { Flashcard } from '@repo/shared';
import {
  type ConfidenceLevel,
  CONFIDENCE_OPTIONS,
} from '@/lib/spacedRepetition';
import { ConfidenceRatingButtons } from './ConfidenceRatingButtons';
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Tag,
  KeyRound,
  Check,
} from 'lucide-react';

interface FlashcardDeckProps {
  card: Flashcard;
  currentIndex: number;
  totalCards: number;
  isFlipped: boolean;
  onFlip: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  currentRating?: ConfidenceLevel;
  onSelectRating: (rating: ConfidenceLevel) => void;
  requirementMap?: Record<string, string>;
}

export function FlashcardDeck({
  card,
  currentIndex,
  totalCards,
  isFlipped,
  onFlip,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentRating,
  onSelectRating,
  requirementMap = {},
}: FlashcardDeckProps) {
  const currentOption = currentRating ? CONFIDENCE_OPTIONS[currentRating] : null;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* 3D Flip Card Container */}
      <div className="w-full h-[420px] sm:h-[400px] perspective-1000 select-none">
        <div
          onClick={onFlip}
          className={`relative w-full h-full cursor-pointer transition-transform duration-500 preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          role="button"
          tabIndex={0}
          aria-label={isFlipped ? 'Answer face. Click to flip to question.' : 'Question face. Click to reveal answer.'}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onFlip();
            }
          }}
        >
          {/* FRONT FACE (Question / Concept) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl border-2 border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-6 sm:p-8 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:shadow-black/40 flex flex-col justify-between">
            {/* Top metadata row */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                  Card {currentIndex + 1} of {totalCards}
                </span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-mono font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {card.id}
                </span>
                {card.requirement_ids.map((rid) => (
                  <span
                    key={rid}
                    className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                    title={requirementMap[rid] || rid}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    <span>{rid}</span>
                  </span>
                ))}
              </div>

              {currentOption && (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${currentOption.badgeClass}`}
                >
                  <Check className="h-3 w-3" />
                  <span>{currentOption.label}</span>
                </div>
              )}
            </div>

            {/* Prompt / Question Content */}
            <div className="my-auto py-4 overflow-y-auto max-h-[220px]">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Active Recall Prompt</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {card.front}
              </p>
            </div>

            {/* Bottom flip hint */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-pink-500 animate-spin-slow" />
                <span>Click card or press <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-600 dark:text-slate-400">Space</kbd> to reveal answer</span>
              </span>
              <span className="hidden sm:inline text-[11px]">3D Flip View</span>
            </div>
          </div>

          {/* BACK FACE (Answer / Solution) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl border-2 border-indigo-200/80 bg-gradient-to-b from-white to-indigo-50/20 p-6 sm:p-8 shadow-xl shadow-indigo-100/40 dark:border-indigo-900/60 dark:from-slate-900 dark:to-slate-950 dark:shadow-black/40 flex flex-col justify-between">
            {/* Top metadata row */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  Solution & Key Principles
                </span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-mono font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {card.id}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <RotateCw className="h-3 w-3" />
                <span>Show Prompt</span>
              </button>
            </div>

            {/* Answer Content */}
            <div className="my-auto py-3 overflow-y-auto max-h-[170px] pr-1">
              <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {card.back}
              </p>
            </div>

            {/* Bottom: Confidence Rating Buttons */}
            <div
              className="pt-3 border-t border-slate-100 dark:border-slate-800/80"
              onClick={(e) => e.stopPropagation()} // Prevent card flip when clicking rating buttons
            >
              <ConfidenceRatingButtons
                currentRating={currentRating}
                onSelectRating={onSelectRating}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stepping & Navigation Controls */}
      <div className="w-full mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          title="Previous card (Left Arrow)"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
          <kbd className="hidden sm:inline-block ml-1 font-mono text-[10px] text-slate-400">←</kbd>
        </button>

        <button
          type="button"
          onClick={onFlip}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
          title="Flip card (Spacebar)"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>{isFlipped ? 'Flip to Prompt' : 'Flip to Answer'}</span>
          <kbd className="hidden sm:inline-block ml-1 font-mono text-[10px] text-slate-300 dark:text-slate-600 bg-black/20 dark:bg-white/30 px-1.5 py-0.5 rounded">
            Space
          </kbd>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          title="Next card (Right Arrow)"
        >
          <span>Next</span>
          <kbd className="hidden sm:inline-block mr-1 font-mono text-[10px] text-slate-400">→</kbd>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Dots / Bar Indicator */}
      <div className="w-full mt-4 flex items-center justify-center gap-1.5">
        {totalCards <= 25 ? (
          Array.from({ length: totalCards }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === currentIndex
                  ? 'w-6 bg-pink-600 dark:bg-pink-500'
                  : 'w-1.5 bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))
        ) : (
          <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-600 transition-all duration-300"
              style={{ width: `${Math.round(((currentIndex + 1) / totalCards) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
