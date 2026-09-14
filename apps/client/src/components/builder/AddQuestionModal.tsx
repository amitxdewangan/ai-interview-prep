'use client';

import React, { useState, useEffect } from 'react';
import type { Question, QuestionCategory, RoleRequirement } from '@repo/shared';
import { X, PlusCircle, Tag, AlertCircle } from 'lucide-react';

interface AddQuestionModalProps {
  isOpen: boolean;
  requirements: RoleRequirement[];
  initialCategory?: QuestionCategory;
  onClose: () => void;
  onAddQuestion: (question: Omit<Question, 'id'>) => void;
}

const CATEGORIES: { label: string; value: QuestionCategory }[] = [
  { label: 'Technical', value: 'technical' },
  { label: 'Behavioural', value: 'behavioural' },
  { label: 'System Design', value: 'system-design' },
  { label: 'Company Fit', value: 'company-fit' },
];

export function AddQuestionModal({
  isOpen,
  requirements = [],
  initialCategory = 'technical',
  onClose,
  onAddQuestion,
}: AddQuestionModalProps) {
  const [category, setCategory] = useState<QuestionCategory>(initialCategory);
  const [prompt, setPrompt] = useState('');
  const [answerOutline, setAnswerOutline] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setPrompt('');
      setAnswerOutline('');
      setDifficulty(2);
      setSelectedReqIds(requirements.length > 0 ? [requirements[0].id] : []);
      setError(null);
    }
  }, [isOpen, initialCategory, requirements]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please provide a question prompt.');
      return;
    }
    if (!answerOutline.trim()) {
      setError('Please provide an interviewer answer outline.');
      return;
    }

    onAddQuestion({
      category,
      prompt: prompt.trim(),
      answer_outline: answerOutline.trim(),
      difficulty,
      requirement_ids: selectedReqIds,
    });

    onClose();
  };

  const toggleReqId = (id: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <PlusCircle className="h-5 w-5" />
            </span>
            <h3 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Add Custom Question
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty Level
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                      difficulty === lvl
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Level {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Interview Question Prompt
            </label>
            <textarea
              rows={2}
              required
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. How do you design a reliable retry mechanism with exponential backoff?"
              className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {/* Answer Outline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Interviewer Evaluation Outline
            </label>
            <textarea
              rows={3}
              required
              value={answerOutline}
              onChange={(e) => setAnswerOutline(e.target.value)}
              placeholder="e.g. Candidate should mention jitter to avoid thundering herd, HTTP 429 & 503 handling, idempotency keys..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {/* Linked Requirements Multi-Select */}
          {requirements.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Link to Tested Requirements ({selectedReqIds.length} selected)
              </label>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1 dark:border-slate-800 dark:bg-slate-950/60">
                {requirements.map((req) => {
                  const isChecked = selectedReqIds.includes(req.id);
                  return (
                    <label
                      key={req.id}
                      className="flex items-start gap-2 rounded-lg p-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleReqId(req.id)}
                        className="mt-0.5 accent-indigo-600 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        [{req.id}]
                      </span>
                      <span className="flex-1 text-slate-700 dark:text-slate-300 truncate">
                        {req.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Question</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
