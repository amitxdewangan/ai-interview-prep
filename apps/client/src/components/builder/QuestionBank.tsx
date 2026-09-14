'use client';

import React, { useState, useMemo } from 'react';
import type { Question, QuestionCategory, RoleRequirement } from '@repo/shared';
import { QuestionCard } from './QuestionCard';
import { AddQuestionModal } from './AddQuestionModal';
import {
  Search,
  PlusCircle,
  RotateCcw,
  Pin,
  Layers,
  Sparkles,
  Loader2,
  Filter,
} from 'lucide-react';

interface QuestionBankProps {
  questions: Question[];
  requirements: RoleRequirement[];
  itemMeta?: Record<string, { origin: 'generated' | 'user_edited' | 'user_added'; isPinned: boolean }>;
  regeneratingCategory?: string | null;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void;
  onTogglePin: (id: string) => void;
  onMoveCategory: (id: string, newCategory: QuestionCategory) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onDeleteQuestion: (id: string) => void;
  onAddQuestion: (newQuestion: Omit<Question, 'id'>) => void;
  onRegenerateCategory: (category: QuestionCategory) => void;
}

type TabFilter = 'all' | QuestionCategory | 'pinned';

export function QuestionBank({
  questions = [],
  requirements = [],
  itemMeta = {},
  regeneratingCategory = null,
  onUpdateQuestion,
  onTogglePin,
  onMoveCategory,
  onReorder,
  onDeleteQuestion,
  onAddQuestion,
  onRegenerateCategory,
}: QuestionBankProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Category counts
  const counts = useMemo(() => {
    const c = {
      all: questions.length,
      technical: 0,
      behavioural: 0,
      'system-design': 0,
      'company-fit': 0,
      pinned: 0,
    };
    for (const q of questions) {
      if (c[q.category] !== undefined) c[q.category]++;
      if (itemMeta[q.id]?.isPinned) c.pinned++;
    }
    return c;
  }, [questions, itemMeta]);

  // Filtered and searched questions
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Tab filter
      if (activeTab === 'pinned') {
        if (!itemMeta[q.id]?.isPinned) return false;
      } else if (activeTab !== 'all') {
        if (q.category !== activeTab) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesPrompt = q.prompt.toLowerCase().includes(query);
        const matchesOutline = q.answer_outline.toLowerCase().includes(query);
        const matchesReq = q.requirement_ids.some((r) => r.toLowerCase().includes(query));
        const matchesId = q.id.toLowerCase().includes(query);
        if (!matchesPrompt && !matchesOutline && !matchesReq && !matchesId) return false;
      }

      return true;
    });
  }, [questions, activeTab, searchQuery, itemMeta]);

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Tabs & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by topic, keyword, or requirement ID..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Add Question Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('technical')}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            activeTab === 'technical'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Technical ({counts.technical})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('behavioural')}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            activeTab === 'behavioural'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Behavioural ({counts.behavioural})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system-design')}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            activeTab === 'system-design'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          System Design ({counts['system-design']})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('company-fit')}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            activeTab === 'company-fit'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Company Fit ({counts['company-fit']})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pinned')}
          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            activeTab === 'pinned'
              ? 'bg-amber-500 text-white'
              : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'
          }`}
        >
          <Pin className="h-3 w-3 fill-current" />
          <span>Pinned ({counts.pinned})</span>
        </button>
      </div>

      {/* Category-Specific Regeneration Banner */}
      {activeTab !== 'all' && activeTab !== 'pinned' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {activeTab} Question Category
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Single-section regeneration safely preserves all user-edited, added, and pinned items.
            </p>
          </div>

          <button
            type="button"
            disabled={regeneratingCategory === activeTab}
            onClick={() => onRegenerateCategory(activeTab)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            {regeneratingCategory === activeTab ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>Regenerate Category</span>
          </button>
        </div>
      )}

      {/* Questions List */}
      {visibleQuestions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
          <Layers className="mx-auto h-8 w-8 text-slate-400" />
          <h4 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            No questions match this filter
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search query or add a custom question to this category.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleQuestions.map((q, index) => {
            const meta = itemMeta[q.id] || { origin: 'generated', isPinned: false };
            const canMoveUp = index > 0;
            const canMoveDown = index < visibleQuestions.length - 1;

            return (
              <QuestionCard
                key={q.id}
                question={q}
                origin={meta.origin}
                isPinned={meta.isPinned}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onUpdateQuestion={onUpdateQuestion}
                onTogglePin={onTogglePin}
                onMoveCategory={onMoveCategory}
                onReorder={onReorder}
                onDelete={onDeleteQuestion}
              />
            );
          })}
        </div>
      )}

      {/* Add Question Modal */}
      <AddQuestionModal
        isOpen={isAddModalOpen}
        requirements={requirements}
        initialCategory={activeTab !== 'all' && activeTab !== 'pinned' ? activeTab : 'technical'}
        onClose={() => setIsAddModalOpen(false)}
        onAddQuestion={onAddQuestion}
      />
    </div>
  );
}
