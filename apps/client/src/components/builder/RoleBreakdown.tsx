'use client';

import React, { useState } from 'react';
import type { RoleRequirement, Question } from '@repo/shared';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Star,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RoleBreakdownProps {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: RoleRequirement[];
  questions: Question[];
}

export function RoleBreakdown({
  title,
  seniority,
  responsibilities = [],
  requirements = [],
  questions = [],
}: RoleBreakdownProps) {
  const [filter, setFilter] = useState<'all' | 'must' | 'technical' | 'behavioural' | 'domain'>('all');
  const [showResponsibilities, setShowResponsibilities] = useState(false);

  // Map each requirement to question IDs testing it
  const coverageMap = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of requirements) {
      map.set(r.id, []);
    }
    for (const q of questions) {
      for (const reqId of q.requirement_ids) {
        const existing = map.get(reqId) || [];
        if (!existing.includes(q.id)) {
          existing.push(q.id);
          map.set(reqId, existing);
        }
      }
    }
    return map;
  }, [requirements, questions]);

  const filteredRequirements = requirements.filter((r) => {
    if (filter === 'must') return r.priority === 'must';
    if (filter === 'technical') return r.kind === 'technical';
    if (filter === 'behavioural') return r.kind === 'behavioural';
    if (filter === 'domain') return r.kind === 'domain';
    return true;
  });

  const mustHaveCount = requirements.filter((r) => r.priority === 'must').length;
  const uncoveredMustHaves = requirements.filter(
    (r) => r.priority === 'must' && (coverageMap.get(r.id)?.length || 0) === 0
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Role Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                {seniority}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {requirements.length} Core Requirements &bull; {mustHaveCount} Must-Have Priorities
            </p>
          </div>
        </div>

        {/* Coverage summary status */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {uncoveredMustHaves.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>100% Must-Haves Covered</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <span>{uncoveredMustHaves.length} Uncovered Must-Have Gap(s)</span>
            </span>
          )}
        </div>
      </div>

      {/* Responsibilities collapsible drawer */}
      {responsibilities.length > 0 && (
        <div className="mt-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowResponsibilities(!showResponsibilities)}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition"
          >
            <span>Target Role Responsibilities ({responsibilities.length})</span>
            {showResponsibilities ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showResponsibilities && (
            <ul className="mt-2.5 space-y-1.5 pl-4 list-disc text-xs text-slate-600 dark:text-slate-400">
              {responsibilities.map((resp, i) => (
                <li key={i} className="leading-relaxed">
                  {resp}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Requirement Filter Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          All ({requirements.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('must')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            filter === 'must'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Must-Have ({mustHaveCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('technical')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            filter === 'technical'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Technical
        </button>
        <button
          type="button"
          onClick={() => setFilter('behavioural')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            filter === 'behavioural'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Behavioural
        </button>
        <button
          type="button"
          onClick={() => setFilter('domain')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            filter === 'domain'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Domain
        </button>
      </div>

      {/* Requirements List */}
      <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredRequirements.map((req) => {
          const coveredBy = coverageMap.get(req.id) || [];
          const isCovered = coveredBy.length > 0;

          return (
            <div
              key={req.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs transition ${
                !isCovered && req.priority === 'must'
                  ? 'border-rose-300 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20'
                  : 'border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-950/40'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span className="shrink-0 rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {req.id}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {req.text}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {/* Kind badge */}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${
                        req.kind === 'technical'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : req.kind === 'behavioural'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {req.kind}
                    </span>

                    {/* Priority badge */}
                    <span
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        req.priority === 'must'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {req.priority === 'must' && <Star className="h-2.5 w-2.5 fill-current" />}
                      {req.priority === 'must' ? 'Must-Have' : 'Nice-to-Have'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coverage link badge */}
              <div className="self-end sm:self-center shrink-0">
                {isCovered ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Tested by {coveredBy.join(', ')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Uncovered Gap</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
