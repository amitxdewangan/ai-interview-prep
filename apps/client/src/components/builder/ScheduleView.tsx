'use client';

import React, { useState } from 'react';
import type { AppendixAKit, Question, RoleRequirement } from '@repo/shared';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Star,
  CheckCircle2,
  Loader2,
  FileQuestion,
} from 'lucide-react';

interface ScheduleViewProps {
  schedule: AppendixAKit['schedule'];
  questions: Question[];
  requirements: RoleRequirement[];
  isRegenerating?: boolean;
  onRegenerateSchedule: () => void;
}

export function ScheduleView({
  schedule,
  questions = [],
  requirements = [],
  isRegenerating = false,
  onRegenerateSchedule,
}: ScheduleViewProps) {
  // Expand all days or individual days
  const [expandedDays, setExpandedDays] = useState<number[]>(
    schedule.days.length > 0 ? [1] : [] // Day 1 open by default
  );

  const toggleDay = (dayNum: number) => {
    setExpandedDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
    );
  };

  const expandAll = () => setExpandedDays(schedule.days.map((d) => d.day));
  const collapseAll = () => setExpandedDays([]);

  // Create question lookup map
  const questionMap = React.useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) {
      map.set(q.id, q);
    }
    return map;
  }, [questions]);

  // Create must-have requirements lookup
  const mustReqMap = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of requirements) {
      if (r.priority === 'must') set.add(r.id);
    }
    return set;
  }, [requirements]);

  const totalMinutes = schedule.days.reduce((acc, d) => acc + d.minutes, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {schedule.days_available}-Day Preparation Timeline
              </h2>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Deterministic Allocation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {totalMinutes} Total Minutes (Avg. {Math.round(totalMinutes / (schedule.days_available || 1))} min/day)
              </span>
              <span>&bull;</span>
              <span>Harder & must-have questions prioritized earlier</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={expandedDays.length === schedule.days.length ? collapseAll : expandAll}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
          >
            {expandedDays.length === schedule.days.length ? 'Collapse All' : 'Expand All'}
          </button>

          <button
            type="button"
            onClick={onRegenerateSchedule}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition disabled:opacity-50"
            title="Re-run algorithmic schedule distribution across current questions"
          >
            {isRegenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>Regenerate Schedule</span>
          </button>
        </div>
      </div>

      {/* Days Timeline Accordion */}
      <div className="mt-6 space-y-3">
        {schedule.days.map((day) => {
          const isExpanded = expandedDays.includes(day.day);
          const dayQuestions = day.question_ids
            .map((qid) => questionMap.get(qid))
            .filter((q): q is Question => q !== undefined);

          // Check if day has must-have questions
          const hasMustHave = dayQuestions.some((q) =>
            q.requirement_ids.some((reqId) => mustReqMap.has(reqId))
          );

          return (
            <div
              key={day.day}
              className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden dark:border-slate-800 dark:bg-slate-950/40 transition-colors"
            >
              {/* Day Header Accordion Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day.day)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm">
                    D{day.day}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {day.focus}
                      </span>
                      {hasMustHave && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          Must-Have Focus
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {dayQuestions.length} Questions &bull; {day.minutes} Minutes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {day.minutes} min
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {/* Day Questions Details */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-white p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900">
                  {dayQuestions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No questions assigned to this day.</p>
                  ) : (
                    dayQuestions.map((q) => {
                      const isMust = q.requirement_ids.some((reqId) => mustReqMap.has(reqId));
                      return (
                        <div
                          key={q.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                        >
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="shrink-0 font-mono text-[10px] font-bold text-slate-500 mt-0.5">
                              {q.id}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {q.prompt}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="capitalize text-slate-500">{q.category}</span>
                                <span>&bull;</span>
                                <span
                                  className={
                                    q.difficulty === 1
                                      ? 'text-emerald-600'
                                      : q.difficulty === 2
                                      ? 'text-amber-600'
                                      : 'text-rose-600'
                                  }
                                >
                                  Diff {q.difficulty}
                                </span>
                                <span>&bull;</span>
                                <span className="font-mono text-slate-400">
                                  [{q.requirement_ids.join(', ')}]
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="self-end sm:self-center shrink-0">
                            {isMust && (
                              <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                Must-Have
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
