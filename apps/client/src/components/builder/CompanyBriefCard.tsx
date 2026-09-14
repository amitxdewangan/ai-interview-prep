'use client';

import React, { useState } from 'react';
import {
  Building2,
  Globe,
  Calendar,
  RotateCcw,
  Edit3,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface CompanyBriefCardProps {
  company: string;
  companyUrl: string;
  location: string;
  researchedAt: string;
  pagesUsed: string[];
  summary: string;
  whatTheyDo: string;
  isEdited?: boolean;
  isRegenerating?: boolean;
  onUpdateBrief: (summary: string, whatTheyDo: string) => void;
  onRegenerateBrief: () => void;
}

export function CompanyBriefCard({
  company,
  companyUrl,
  location,
  researchedAt,
  pagesUsed = [],
  summary,
  whatTheyDo,
  isEdited = false,
  isRegenerating = false,
  onUpdateBrief,
  onRegenerateBrief,
}: CompanyBriefCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftSummary, setDraftSummary] = useState(summary);
  const [draftWhatTheyDo, setDraftWhatTheyDo] = useState(whatTheyDo);

  const handleSaveEdit = () => {
    onUpdateBrief(draftSummary.trim(), draftWhatTheyDo.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftSummary(summary);
    setDraftWhatTheyDo(whatTheyDo);
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{company}</h2>
              {isEdited && (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  Edited
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <a
                href={companyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{companyUrl}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <span>&bull;</span>
              <span>{location}</span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(researchedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraftSummary(summary);
                  setDraftWhatTheyDo(whatTheyDo);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Brief
              </button>
              <button
                type="button"
                onClick={onRegenerateBrief}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition disabled:opacity-50"
                title="Re-crawl and regenerate company brief"
              >
                {isRegenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>Regenerate Brief</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition"
              >
                <Check className="h-3.5 w-3.5" />
                Done
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 transition"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="mt-4 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company Summary
              </label>
              <textarea
                rows={3}
                value={draftSummary}
                onChange={(e) => setDraftSummary(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                What They Do / Core Domain
              </label>
              <textarea
                rows={2}
                value={draftWhatTheyDo}
                onChange={(e) => setDraftWhatTheyDo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Company Overview
              </h4>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {summary}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Product & Domain Focus
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {whatTheyDo}
              </p>
            </div>
          </>
        )}

        {/* Crawled Sources List */}
        {pagesUsed.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Signal Sources Researched ({pagesUsed.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {pagesUsed.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition truncate max-w-xs"
                >
                  <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
