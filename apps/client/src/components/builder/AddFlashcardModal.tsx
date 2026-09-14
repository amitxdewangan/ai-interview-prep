'use client';

import React, { useState, useEffect } from 'react';
import type { Flashcard, RoleRequirement } from '@repo/shared';
import { X, PlusCircle, AlertCircle, Sparkles } from 'lucide-react';

interface AddFlashcardModalProps {
  isOpen: boolean;
  requirements: RoleRequirement[];
  onClose: () => void;
  onAddFlashcard: (card: Omit<Flashcard, 'id'>) => void;
}

export function AddFlashcardModal({
  isOpen,
  requirements = [],
  onClose,
  onAddFlashcard,
}: AddFlashcardModalProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFront('');
      setBack('');
      setSelectedReqIds(requirements.length > 0 ? [requirements[0].id] : []);
      setError(null);
    }
  }, [isOpen, requirements]);

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
    if (!front.trim()) {
      setError('Please provide the front (prompt/concept) for the flashcard.');
      return;
    }
    if (!back.trim()) {
      setError('Please provide the back (solution/key principle) for the flashcard.');
      return;
    }

    onAddFlashcard({
      front: front.trim(),
      back: back.trim(),
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
      aria-labelledby="flashcard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 id="flashcard-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Add Custom Flashcard
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
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Front: Concept / Scenario / Code Challenge
            </label>
            <textarea
              rows={3}
              required
              autoFocus
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="e.g. What is the difference between optimistic concurrency control and pessimistic locking?"
              className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Back: Concise Solution & Key Principles
            </label>
            <textarea
              rows={4}
              required
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="e.g. Optimistic checks version/timestamp at write time (better for read-heavy workloads). Pessimistic locks rows ahead of time (better for high write conflict)..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {requirements.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Link to Tested Requirements ({selectedReqIds.length} selected)
              </label>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1 dark:border-slate-800 dark:bg-slate-950/60">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-pink-500 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Flashcard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
