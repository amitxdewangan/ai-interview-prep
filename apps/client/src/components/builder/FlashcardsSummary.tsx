'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Flashcard, RoleRequirement } from '@repo/shared';
import { AddFlashcardModal } from './AddFlashcardModal';
import {
  Zap,
  PlusCircle,
  Tag,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface FlashcardsSummaryProps {
  kitId: string;
  flashcards: Flashcard[];
  requirements: RoleRequirement[];
  onAddFlashcard: (card: Omit<Flashcard, 'id'>) => void;
}

export function FlashcardsSummary({
  kitId,
  flashcards = [],
  requirements = [],
  onAddFlashcard,
}: FlashcardsSummaryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Active Recall Flashcards
              </h2>
              <span className="rounded-md bg-pink-100 px-2 py-0.5 text-xs font-bold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                {flashcards.length} Cards Available
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              High-yield concept checks designed for spaced repetition and rapid drill.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Card</span>
          </button>

          <Link
            href={`/kit/${kitId}/practice`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-pink-500 transition"
          >
            <span>Practice Mode</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Cards Preview Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {flashcards.slice(0, 6).map((card) => (
          <div
            key={card.id}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs dark:border-slate-800/80 dark:bg-slate-950/40 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                <span>{card.id}</span>
                <span>[{card.requirement_ids.join(', ')}]</span>
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                {card.front}
              </p>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 border-t border-slate-100 pt-1.5 dark:border-slate-800">
              {card.back}
            </p>
          </div>
        ))}
      </div>

      {flashcards.length > 6 && (
        <div className="mt-4 text-center">
          <Link
            href={`/kit/${kitId}/practice`}
            className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-500 dark:text-pink-400 transition"
          >
            <span>View all {flashcards.length} cards in Practice Mode</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <AddFlashcardModal
        isOpen={isModalOpen}
        requirements={requirements}
        onClose={() => setIsModalOpen(false)}
        onAddFlashcard={onAddFlashcard}
      />
    </div>
  );
}
