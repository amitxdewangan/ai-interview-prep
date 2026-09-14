'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  AppendixAKit,
  Question,
  QuestionCategory,
  Flashcard,
} from '@repo/shared';
import { api, type KitRecord, type RegenerationResponse } from '@/lib/api';
import { CompanyBriefCard } from '@/components/builder/CompanyBriefCard';
import { RoleBreakdown } from '@/components/builder/RoleBreakdown';
import { QuestionBank } from '@/components/builder/QuestionBank';
import { ScheduleView } from '@/components/builder/ScheduleView';
import { FlashcardsSummary } from '@/components/builder/FlashcardsSummary';
import {
  ArrowLeft,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
  Mic,
  Loader2,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export default function KitBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = typeof params?.id === 'string' ? params.id : '';

  // Server record and optimistic local state
  const [originalRecord, setOriginalRecord] = useState<KitRecord | null>(null);
  const [kit, setKit] = useState<AppendixAKit | null>(null);
  const [itemMeta, setItemMeta] = useState<
    Record<string, { origin: 'generated' | 'user_edited' | 'user_added'; isPinned: boolean }>
  >({});
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(
    null
  );

  // Active view tab: 'questions' | 'schedule' | 'requirements' | 'flashcards'
  const [activeViewTab, setActiveViewTab] = useState<
    'questions' | 'schedule' | 'requirements' | 'flashcards'
  >('questions');

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Load kit on mount
  const loadKit = useCallback(async () => {
    if (!kitId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const record = await api.getKitById(kitId);
      setOriginalRecord(record);
      setKit(record.kit);
      setItemMeta(record.itemMeta || {});
      setDeletedItemIds(record.deletedItemIds || []);
      setIsDirty(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load preparation kit');
    } finally {
      setLoading(false);
    }
  }, [kitId]);

  useEffect(() => {
    loadKit();
  }, [loadKit]);

  // Save changes to backend
  const handleSaveChanges = async () => {
    if (!kit) return;
    setIsSaving(true);
    try {
      const updated = await api.updateKit(kitId, {
        kit,
        itemMeta,
        deletedItemIds,
      });
      setOriginalRecord(updated);
      setIsDirty(false);
      setToast({
        type: 'success',
        message: 'All changes saved to your preparation kit.',
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save changes',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          handleSaveChanges();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isSaving, kit, itemMeta, deletedItemIds]);

  // 1. Update Company Brief
  const handleUpdateBrief = (summary: string, whatTheyDo: string) => {
    if (!kit) return;
    setKit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        company_brief: {
          ...prev.company_brief,
          summary,
          what_they_do: whatTheyDo,
        },
      };
    });
    setItemMeta((prev) => ({
      ...prev,
      company_brief: { origin: 'user_edited', isPinned: true },
    }));
    setIsDirty(true);
  };

  // 2. Update Question
  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    if (!kit) return;
    setKit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
      };
    });
    setItemMeta((prev) => {
      const current = prev[id] || { origin: 'generated', isPinned: false };
      return {
        ...prev,
        [id]: {
          origin: current.origin === 'user_added' ? 'user_added' : 'user_edited',
          isPinned: current.isPinned,
        },
      };
    });
    setIsDirty(true);
  };

  // 3. Toggle Pin Question
  const handleTogglePin = (id: string) => {
    setItemMeta((prev) => {
      const current = prev[id] || { origin: 'generated', isPinned: false };
      return {
        ...prev,
        [id]: {
          ...current,
          isPinned: !current.isPinned,
        },
      };
    });
    setIsDirty(true);
  };

  // 4. Move Question Category
  const handleMoveCategory = (id: string, newCategory: QuestionCategory) => {
    if (!kit) return;
    setKit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === id ? { ...q, category: newCategory } : q
        ),
      };
    });
    setItemMeta((prev) => {
      const current = prev[id] || { origin: 'generated', isPinned: false };
      return {
        ...prev,
        [id]: {
          origin: current.origin === 'user_added' ? 'user_added' : 'user_edited',
          isPinned: current.isPinned,
        },
      };
    });
    setIsDirty(true);
  };

  // 5. Reorder Question within its category
  const handleReorder = (id: string, direction: 'up' | 'down') => {
    if (!kit) return;
    const qIndex = kit.questions.findIndex((q) => q.id === id);
    if (qIndex === -1) return;

    const targetQuestion = kit.questions[qIndex];
    // Find adjacent question in the same category
    const sameCategoryQuestions = kit.questions.filter(
      (q) => q.category === targetQuestion.category
    );
    const catIndex = sameCategoryQuestions.findIndex((q) => q.id === id);

    const swapTargetCatIndex = direction === 'up' ? catIndex - 1 : catIndex + 1;
    if (swapTargetCatIndex < 0 || swapTargetCatIndex >= sameCategoryQuestions.length) return;

    const swapWithQuestion = sameCategoryQuestions[swapTargetCatIndex];
    const swapWithGlobalIndex = kit.questions.findIndex((q) => q.id === swapWithQuestion.id);

    // Swap in global array
    const newQuestions = [...kit.questions];
    newQuestions[qIndex] = swapWithQuestion;
    newQuestions[swapWithGlobalIndex] = targetQuestion;

    setKit((prev) => (prev ? { ...prev, questions: newQuestions } : prev));
    setIsDirty(true);
  };

  // 6. Delete Question
  const handleDeleteQuestion = (id: string) => {
    if (!kit) return;
    setKit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.filter((q) => q.id !== id),
        schedule: {
          ...prev.schedule,
          days: prev.schedule.days.map((d) => ({
            ...d,
            question_ids: d.question_ids.filter((qid) => qid !== id),
          })),
        },
      };
    });
    setDeletedItemIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setIsDirty(true);
  };

  // 7. Add Custom Question
  const handleAddQuestion = (newQuestion: Omit<Question, 'id'>) => {
    if (!kit) return;
    const newId = `q-custom-${Date.now().toString().slice(-4)}`;
    const created: Question = {
      ...newQuestion,
      id: newId,
    };

    setKit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: [...prev.questions, created],
      };
    });

    setItemMeta((prev) => ({
      ...prev,
      [newId]: { origin: 'user_added', isPinned: true },
    }));

    setIsDirty(true);
    setToast({
      type: 'info',
      message: `Added custom question "${newId}". Pinned automatically to protect from regeneration.`,
    });
  };

  // 8. Add Custom Flashcard
  const handleAddFlashcard = (newCard: Omit<Flashcard, 'id'>) => {
    if (!kit) return;
    const newId = `f-custom-${Date.now().toString().slice(-4)}`;
    const created: Flashcard = {
      ...newCard,
      id: newId,
    };

    setKit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        flashcards: [...prev.flashcards, created],
      };
    });

    setItemMeta((prev) => ({
      ...prev,
      [newId]: { origin: 'user_added', isPinned: true },
    }));

    setIsDirty(true);
    setToast({
      type: 'info',
      message: `Added custom flashcard "${newId}".`,
    });
  };

  // 9. Scoped Section Regeneration
  const handleRegenerateSection = async (section: string) => {
    if (!kit) return;
    setRegeneratingSection(section);

    try {
      // First save dirty changes so backend has latest user edits & pins
      if (isDirty) {
        await api.updateKit(kitId, { kit, itemMeta, deletedItemIds });
      }

      const result: RegenerationResponse = await api.regenerateSection(kitId, section);

      // Apply server response
      setKit(result.kit);
      setItemMeta(result.itemMeta);
      setDeletedItemIds(result.deletedItemIds || []);
      setIsDirty(false);

      setToast({
        type: 'success',
        message:
          result.message ||
          `Regenerated section '${section}'. Preserved ${result.preservedCount} custom items.`,
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Regeneration failed',
      });
    } finally {
      setRegeneratingSection(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-44 animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
        <div className="h-96 animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  if (loadError || !kit) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 dark:border-rose-900/60 dark:bg-slate-900 shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
            Preparation Kit Unavailable
          </h2>
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {loadError || 'Kit not found or access denied.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const uncoveredCount = kit.coverage?.uncovered_requirement_ids?.length || 0;
  const pinnedCount = Object.values(itemMeta).filter((m) => m.isPinned).length;

  return (
    <div className="space-y-8 pb-16">
      {/* Sticky Action Bar */}
      <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Return to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {kit.source.company}
              </span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                {kit.role.title}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{kit.questions.length} Questions</span>
              <span>&bull;</span>
              <span>{pinnedCount} Pinned</span>
              <span>&bull;</span>
              {uncoveredCount === 0 ? (
                <span className="text-emerald-600 font-semibold">100% Covered</span>
              ) : (
                <span className="text-amber-600 font-semibold">{uncoveredCount} Gaps</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Unsaved Changes Indicator */}
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse">
              Unsaved Changes (Ctrl+S)
            </span>
          )}

          {/* Save Changes Button */}
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={!isDirty || isSaving}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
              isDirty
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isDirty ? (
              <Save className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span>{isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}</span>
          </button>

          {/* Direct Link to Practice Mode */}
          <Link
            href={`/kit/${kitId}/practice`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-pink-50 px-3.5 py-2 text-xs font-bold text-pink-700 hover:bg-pink-100 dark:bg-pink-950/60 dark:text-pink-300 dark:hover:bg-pink-900 transition"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Practice</span>
          </Link>

          {/* Direct Link to Mock Interview */}
          <Link
            href={`/kit/${kitId}/mock`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900 transition"
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mock Room</span>
          </Link>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl p-4 shadow-2xl text-xs font-semibold border animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toast.type === 'info'
              ? 'bg-indigo-900 text-white border-indigo-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Grid: Company Brief & Role Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompanyBriefCard
          company={kit.source.company}
          companyUrl={kit.source.company_url}
          location={kit.source.location}
          researchedAt={kit.source.researched_at}
          pagesUsed={kit.source.pages_used}
          summary={kit.company_brief.summary}
          whatTheyDo={kit.company_brief.what_they_do}
          isEdited={itemMeta.company_brief?.origin === 'user_edited'}
          isRegenerating={regeneratingSection === 'company_brief'}
          onUpdateBrief={handleUpdateBrief}
          onRegenerateBrief={() => handleRegenerateSection('company_brief')}
        />

        <RoleBreakdown
          title={kit.role.title}
          seniority={kit.role.seniority}
          responsibilities={kit.role.responsibilities}
          requirements={kit.role.requirements}
          questions={kit.questions}
        />
      </div>

      {/* Section View Tabs: Questions | Schedule | Flashcards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveViewTab('questions')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeViewTab === 'questions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Question Bank ({kit.questions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('schedule')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeViewTab === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {kit.schedule.days_available}-Day Schedule
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('flashcards')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeViewTab === 'flashcards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Flashcards ({kit.flashcards.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Question Bank */}
        {activeViewTab === 'questions' && (
          <QuestionBank
            questions={kit.questions}
            requirements={kit.role.requirements}
            itemMeta={itemMeta}
            regeneratingCategory={regeneratingSection}
            onUpdateQuestion={handleUpdateQuestion}
            onTogglePin={handleTogglePin}
            onMoveCategory={handleMoveCategory}
            onReorder={handleReorder}
            onDeleteQuestion={handleDeleteQuestion}
            onAddQuestion={handleAddQuestion}
            onRegenerateCategory={(cat) => handleRegenerateSection(cat)}
          />
        )}

        {/* Tab 2: Schedule View */}
        {activeViewTab === 'schedule' && (
          <ScheduleView
            schedule={kit.schedule}
            questions={kit.questions}
            requirements={kit.role.requirements}
            isRegenerating={regeneratingSection === 'schedule'}
            onRegenerateSchedule={() => handleRegenerateSection('schedule')}
          />
        )}

        {/* Tab 3: Flashcards Overview */}
        {activeViewTab === 'flashcards' && (
          <FlashcardsSummary
            kitId={kitId}
            flashcards={kit.flashcards}
            requirements={kit.role.requirements}
            onAddFlashcard={handleAddFlashcard}
          />
        )}
      </div>
    </div>
  );
}
