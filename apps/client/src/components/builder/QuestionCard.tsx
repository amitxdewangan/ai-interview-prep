'use client';

import React, { useState } from 'react';
import type { Question, QuestionCategory } from '@repo/shared';
import {
  Pin,
  PinOff,
  Edit3,
  Check,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderInput,
  CheckCircle2,
  Tag,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  origin?: 'generated' | 'user_edited' | 'user_added';
  isPinned?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void;
  onTogglePin: (id: string) => void;
  onMoveCategory: (id: string, newCategory: QuestionCategory) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: { label: string; value: QuestionCategory }[] = [
  { label: 'Technical', value: 'technical' },
  { label: 'Behavioural', value: 'behavioural' },
  { label: 'System Design', value: 'system-design' },
  { label: 'Company Fit', value: 'company-fit' },
];

export function QuestionCard({
  question,
  origin = 'generated',
  isPinned = false,
  canMoveUp = false,
  canMoveDown = false,
  onUpdateQuestion,
  onTogglePin,
  onMoveCategory,
  onReorder,
  onDelete,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [answerOutline, setAnswerOutline] = useState(question.answer_outline);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(question.difficulty);

  const handleSave = () => {
    onUpdateQuestion(question.id, {
      prompt: prompt.trim(),
      answer_outline: answerOutline.trim(),
      difficulty,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPrompt(question.prompt);
    setAnswerOutline(question.answer_outline);
    setDifficulty(question.difficulty);
    setIsEditing(false);
  };

  // Keyboard shortcut for moving up/down (Alt+ArrowUp, Alt+ArrowDown)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key === 'ArrowUp' && canMoveUp) {
      e.preventDefault();
      onReorder(question.id, 'up');
    } else if (e.altKey && e.key === 'ArrowDown' && canMoveDown) {
      e.preventDefault();
      onReorder(question.id, 'down');
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`rounded-2xl border transition-all p-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        isPinned
          ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-800/80 dark:bg-indigo-950/20'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Question ID */}
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {question.id}
          </span>

          {/* Origin Badge */}
          {origin === 'user_added' ? (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Manual Custom
            </span>
          ) : origin === 'user_edited' ? (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              User Edited
            </span>
          ) : (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Generated
            </span>
          )}

          {/* Difficulty Badge */}
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
              question.difficulty === 1
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : question.difficulty === 2
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {question.difficulty === 1 ? 'Easy' : question.difficulty === 2 ? 'Medium' : 'Hard'} (Level {question.difficulty})
          </span>

          {/* Linked Requirements */}
          {question.requirement_ids.map((reqId) => (
            <span
              key={reqId}
              className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            >
              <Tag className="h-2.5 w-2.5" />
              {reqId}
            </span>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Reorder Buttons */}
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={() => onReorder(question.id, 'up')}
            title="Move Question Up (Alt+Up)"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={() => onReorder(question.id, 'down')}
            title="Move Question Down (Alt+Down)"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          {/* Move Category Selector */}
          <div className="relative inline-flex items-center">
            <select
              value={question.category}
              onChange={(e) => onMoveCategory(question.id, e.target.value as QuestionCategory)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-6 text-[11px] font-medium text-slate-700 hover:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Move to another category"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  Move: {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pin Button */}
          <button
            type="button"
            onClick={() => onTogglePin(question.id)}
            title={isPinned ? 'Unpin question' : 'Pin question (protect from category regeneration)'}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
              isPinned
                ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {isPinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>

          {/* Edit Toggle */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              title="Edit question text and outline"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                title="Save changes"
                className="rounded-lg bg-emerald-600 p-1 text-white hover:bg-emerald-500 transition shadow"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                title="Cancel edits"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete question "${question.id}"?`)) {
                onDelete(question.id);
              }
            }}
            title="Delete question"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Question Body */}
      <div className="mt-3.5 space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Question Prompt
              </label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Answer Outline & Interviewer Expectations
              </label>
              <textarea
                rows={3}
                value={answerOutline}
                onChange={(e) => setAnswerOutline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty Level
              </label>
              <div className="flex items-center gap-2">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      difficulty === lvl
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Level {lvl} ({lvl === 1 ? 'Easy' : lvl === 2 ? 'Medium' : 'Hard'})
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {question.prompt}
              </h3>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/50">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                <span>Interviewer Evaluation Outline</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {question.answer_outline}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
