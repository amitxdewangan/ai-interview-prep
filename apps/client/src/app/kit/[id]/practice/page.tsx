'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AppendixAKit, Flashcard, RoleRequirement } from '@repo/shared';
import { api, type KitRecord } from '@/lib/api';
import {
  type ConfidenceLevel,
  type PracticeFilter,
  type CardReviewRecord,
  filterReviewQueue,
  calculatePracticeStats,
  loadPracticeState,
  savePracticeState,
  clearPracticeState,
} from '@/lib/spacedRepetition';
import { FlashcardDeck } from '@/components/practice/FlashcardDeck';
import { PracticeStats } from '@/components/practice/PracticeStats';
import { QueueFilterTabs } from '@/components/practice/QueueFilterTabs';
import { QueueCompleteCard } from '@/components/practice/QueueCompleteCard';
import {
  ArrowLeft,
  Zap,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  Keyboard,
  CheckCircle2,
  Layers,
  ChevronRight,
} from 'lucide-react';

const EMPTY_FLASHCARDS: Flashcard[] = [];

export default function PracticeModePage() {
  const params = useParams();
  const router = useRouter();
  const kitId = typeof params?.id === 'string' ? params.id : '';

  // Server record and kit
  const [kitRecord, setKitRecord] = useState<KitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Practice state
  const [records, setRecords] = useState<Record<string, CardReviewRecord>>({});
  const [activeFilter, setActiveFilter] = useState<PracticeFilter>('all');
  const [sessionQueue, setSessionQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [autoSavedNotice, setAutoSavedNotice] = useState(false);

  // Fetch Kit
  const fetchKit = useCallback(async () => {
    if (!kitId) return;
    try {
      setLoading(true);
      setError(null);
      const record = await api.getKitById(kitId);
      setKitRecord(record);

      // Load existing practice records from localStorage
      const stored = loadPracticeState(kitId);
      const initialRecords = stored.records || {};
      setRecords(initialRecords);

      const cards = record?.kit?.flashcards || EMPTY_FLASHCARDS;
      const initialQueue = filterReviewQueue(cards, initialRecords, 'all');
      setSessionQueue(initialQueue);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
    } catch (err: any) {
      console.error('Failed to load kit for practice:', err);
      setError(err.message || 'Failed to load prep kit. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [kitId]);

  useEffect(() => {
    fetchKit();
  }, [fetchKit]);

  const kit: AppendixAKit | null = kitRecord?.kit || null;
  const rawFlashcards: Flashcard[] = kitRecord?.kit?.flashcards || EMPTY_FLASHCARDS;

  // Filter selection handler
  const handleSelectFilter = useCallback(
    (filter: PracticeFilter) => {
      setActiveFilter(filter);
      const cards = kitRecord?.kit?.flashcards || EMPTY_FLASHCARDS;
      const nextQueue = filterReviewQueue(cards, records, filter);
      setSessionQueue(nextQueue);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
    },
    [kitRecord, records]
  );

  // Requirements map for tags
  const requirementMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (kit?.role?.requirements) {
      for (const req of kit.role.requirements) {
        map[req.id] = req.text;
      }
    }
    return map;
  }, [kit]);

  // Dynamic filter counts
  const filterCounts = useMemo(() => {
    const needsReview = rawFlashcards.filter((c) => {
      const rec = records[c.id];
      return rec && (rec.confidence === 1 || rec.confidence === 2);
    }).length;

    const unseen = rawFlashcards.filter((c) => !records[c.id]).length;
    const mastered = rawFlashcards.filter((c) => records[c.id]?.confidence === 4).length;

    return {
      all: rawFlashcards.length,
      needs_review: needsReview,
      unseen,
      mastered,
    };
  }, [rawFlashcards, records]);

  // Overall practice stats
  const stats = useMemo(() => {
    return calculatePracticeStats(rawFlashcards, records);
  }, [rawFlashcards, records]);

  // Current active card
  const activeCard: Flashcard | undefined = sessionQueue[currentIndex];
  const activeRating: ConfidenceLevel | undefined = activeCard
    ? records[activeCard.id]?.confidence
    : undefined;

  // Handle rating selection
  const handleSelectRating = useCallback(
    (rating: ConfidenceLevel) => {
      if (!activeCard) return;

      const now = Date.now();
      const existing = records[activeCard.id];
      const updatedRecord: CardReviewRecord = {
        cardId: activeCard.id,
        confidence: rating,
        reviewedAt: now,
        timesReviewed: (existing?.timesReviewed || 0) + 1,
      };

      const nextRecords = {
        ...records,
        [activeCard.id]: updatedRecord,
      };

      setRecords(nextRecords);
      savePracticeState(kitId, { records: nextRecords, lastReviewedAt: now });

      // Trigger auto-saved visual indicator
      setAutoSavedNotice(true);
      setTimeout(() => setAutoSavedNotice(false), 2000);

      // Auto-step to next card or complete session
      if (currentIndex < sessionQueue.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        // Reached end of current queue
        setIsCompleted(true);
      }
    },
    [activeCard, records, kitId, currentIndex, sessionQueue.length]
  );

  // Stepper handlers
  const handleNext = useCallback(() => {
    if (currentIndex < sessionQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setIsCompleted(true);
    }
  }, [currentIndex, sessionQueue.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      setIsCompleted(false);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focusing input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Space or Enter to flip
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      }

      // Arrow navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }

      // 1-4 for confidence rating
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const level = parseInt(e.key, 10) as ConfidenceLevel;
        handleSelectRating(level);
      }

      // '?' for keyboard help modal
      if (e.key === '?') {
        setShowKeyboardHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrevious, handleSelectRating]);

  // Restart / Reset handlers
  const handleRestartAll = () => {
    setActiveFilter('all');
    const q = filterReviewQueue(rawFlashcards, records, 'all');
    setSessionQueue(q);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  const handleRestartNeedsReview = () => {
    setActiveFilter('needs_review');
    const q = filterReviewQueue(rawFlashcards, records, 'needs_review');
    setSessionQueue(q);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  const handleResetStats = () => {
    if (window.confirm('Are you sure you want to reset all practice ratings for this kit?')) {
      clearPracticeState(kitId);
      setRecords({});
      const q = filterReviewQueue(rawFlashcards, {}, activeFilter);
      setSessionQueue(q);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          <p className="text-sm font-semibold">Loading Practice Deck & Spaced Repetition Queue...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !kit) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/60 dark:bg-slate-900">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Failed to Load Practice Mode
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {error || 'The requested prep kit could not be found.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={fetchKit}
              className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-500"
            >
              Retry
            </button>
            <Link
              href={`/kit/${kitId}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              Back to Builder
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/kit/${kitId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              title="Return to Kit Builder"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Builder</span>
            </Link>

            <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {kit.role.title}
                </span>
                {kit.source?.company && (
                  <span className="text-xs text-slate-400">@ {kit.source.company}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                <Zap className="h-3 w-3" />
                <span>Practice Mode & Spaced Repetition</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-saved indicator */}
            <div
              className={`flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 transition-opacity duration-300 ${
                autoSavedNotice ? 'opacity-100' : 'opacity-0 sm:opacity-75'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Progress Auto-Saved</span>
            </div>

            {/* Keyboard Shortcuts Button */}
            <button
              type="button"
              onClick={() => setShowKeyboardHelp((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden md:inline">Shortcuts</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Practice Stats Overview */}
        <PracticeStats stats={stats} onReset={handleResetStats} />

        {/* Queue Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <QueueFilterTabs
            activeFilter={activeFilter}
            onSelectFilter={handleSelectFilter}
            counts={filterCounts}
          />

          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium self-end sm:self-auto">
            Queue sorted: <span className="font-bold text-slate-600 dark:text-slate-400">Lowest Confidence & Least Recent First</span>
          </div>
        </div>

        {/* Study Deck or Completion / Empty State */}
        {rawFlashcards.length === 0 ? (
          /* Empty flashcards in kit */
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Zap className="mx-auto h-12 w-12 text-pink-500 mb-3 opacity-80" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              No Flashcards in this Prep Kit
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              This kit does not have active recall flashcards yet. You can add custom cards or regenerate sections in the Kit Builder.
            </p>
            <div className="mt-6">
              <Link
                href={`/kit/${kitId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-pink-500"
              >
                <span>Go to Kit Builder</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : sessionQueue.length === 0 ? (
          /* Empty state for the active filter */
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No Cards in &quot;{activeFilter === 'needs_review' ? 'Needs Review' : activeFilter === 'unseen' ? 'Unseen' : 'Mastered'}&quot;
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {activeFilter === 'needs_review'
                ? 'Great job! You have no shaky or failed cards right now.'
                : activeFilter === 'unseen'
                ? 'You have reviewed all cards in this deck at least once.'
                : 'Keep practicing to master more flashcards!'}
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => handleSelectFilter('all')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Switch to Review Queue (All)</span>
              </button>
            </div>
          </div>
        ) : isCompleted ? (
          /* Completion Celebration Card */
          <QueueCompleteCard
            kitId={kitId}
            stats={stats}
            onRestartAll={handleRestartAll}
            onRestartNeedsReview={handleRestartNeedsReview}
          />
        ) : (
          /* 3D Flashcard Study Deck */
          activeCard && (
            <FlashcardDeck
              card={activeCard}
              currentIndex={currentIndex}
              totalCards={sessionQueue.length}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              onPrevious={handlePrevious}
              onNext={handleNext}
              hasPrevious={currentIndex > 0}
              hasNext={currentIndex < sessionQueue.length - 1}
              currentRating={activeRating}
              onSelectRating={handleSelectRating}
              requirementMap={requirementMap}
            />
          )
        )}
      </main>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardHelp && (
        <div
          role="dialog"
          aria-label="Keyboard Shortcuts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Keyboard Shortcuts
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyboardHelp(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Flip card face</span>
                <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono font-bold dark:bg-slate-800">
                  Space / Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Previous / Next card</span>
                <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono font-bold dark:bg-slate-800">
                  ← / →
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Rate: Don&apos;t Know</span>
                <kbd className="rounded bg-rose-100 text-rose-700 px-2 py-0.5 font-mono font-bold dark:bg-rose-950 dark:text-rose-300">
                  1
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Rate: Shaky</span>
                <kbd className="rounded bg-amber-100 text-amber-700 px-2 py-0.5 font-mono font-bold dark:bg-amber-950 dark:text-amber-300">
                  2
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Rate: Confident</span>
                <kbd className="rounded bg-blue-100 text-blue-700 px-2 py-0.5 font-mono font-bold dark:bg-blue-950 dark:text-blue-300">
                  3
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Rate: Mastered</span>
                <kbd className="rounded bg-emerald-100 text-emerald-700 px-2 py-0.5 font-mono font-bold dark:bg-emerald-950 dark:text-emerald-300">
                  4
                </kbd>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setShowKeyboardHelp(false)}
                className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
