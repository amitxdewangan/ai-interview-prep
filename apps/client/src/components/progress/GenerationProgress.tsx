'use client';

import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Sparkles,
  Terminal,
  Clock,
} from 'lucide-react';

export interface ProgressStage {
  id: string;
  label: string;
  description: string;
}

export const CANONICAL_STAGES: ProgressStage[] = [
  {
    id: 'validate',
    label: 'Validating input & sanitizing URL',
    description: 'Enforcing parameter bounds and SSRF protections',
  },
  {
    id: 'crawl',
    label: 'Crawling company website & discovering hiring signals',
    description: 'Exploring public pages, careers handbook, and interview discussions',
  },
  {
    id: 'extract',
    label: 'Extracting role requirements',
    description: 'Extracting must-haves vs nice-to-haves without hallucination',
  },
  {
    id: 'questions',
    label: 'Generating targeted question banks',
    description: 'Specialized prompts for Technical, Behavioural, and System Design',
  },
  {
    id: 'second_pass',
    label: 'Second Pass: Verifying coverage & closing gaps',
    description: 'Deterministic gap analysis and targeted re-generation loop',
  },
  {
    id: 'schedule',
    label: 'Allocating preparation schedule & finalizing kit',
    description: 'Algorithmic distribution across exact days and Appendix A validation',
  },
];

export interface SseLogEntry {
  timestamp: string;
  message: string;
  step?: string;
}

interface GenerationProgressProps {
  currentStatusText?: string;
  currentStep?: string;
  logs?: SseLogEntry[];
  error?: string | null;
  warning?: string | null;
  onRetry?: () => void;
  isCompleted?: boolean;
}

export function GenerationProgress({
  currentStatusText = 'Initializing research pipeline...',
  currentStep = 'validating',
  logs = [],
  error = null,
  warning = null,
  onRetry,
  isCompleted = false,
}: GenerationProgressProps) {
  // Determine the active stage index (0-5) based on status text or step
  const activeStageIndex = useMemo(() => {
    if (isCompleted) return CANONICAL_STAGES.length;
    if (error) return -1;

    const text = (currentStatusText + ' ' + (currentStep || '')).toLowerCase();

    if (text.includes('allocat') || text.includes('schedule') || text.includes('assembling')) {
      return 5;
    }
    if (text.includes('second-pass') || text.includes('coverage') || text.includes('gap')) {
      return 4;
    }
    if (text.includes('question') || text.includes('technical') || text.includes('behavioural')) {
      return 3;
    }
    if (text.includes('extract') || text.includes('role') || text.includes('requirements')) {
      return 2;
    }
    if (text.includes('crawl') || text.includes('gathering') || text.includes('scraping') || text.includes('hiring signals')) {
      return 1;
    }
    return 0; // Default validating
  }, [currentStatusText, currentStep, isCompleted, error]);

  // Non-fatal crawl warning detection from status text or prop
  const detectedWarning = useMemo(() => {
    if (warning) return warning;
    const combined = logs.map((l) => l.message).join(' ') + ' ' + currentStatusText;
    if (
      combined.includes('Unable to access company website') ||
      combined.includes('could not be reached') ||
      combined.includes('Proceeding with JD analysis') ||
      combined.includes('404')
    ) {
      return 'Company site could not be reached. Proceeding with JD analysis.';
    }
    return null;
  }, [warning, logs, currentStatusText]);

  // Progress percentage calculation
  const progressPercent = isCompleted
    ? 100
    : activeStageIndex >= 0
    ? Math.round(((activeStageIndex + 0.5) / CANONICAL_STAGES.length) * 100)
    : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all duration-300"
    >
      {/* Header with Title & Overall Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Autonomous Pipeline Generation
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Executing deliberate multi-step research & second-pass coverage check (30–90s)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {progressPercent}%
            </span>
            <span className="block text-[11px] text-slate-400 font-medium">
              {isCompleted ? 'Complete' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            error
              ? 'bg-rose-500'
              : isCompleted
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Non-fatal warning banner */}
      {detectedWarning && !error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice: </span>
            {detectedWarning}
          </div>
          <span className="rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            NON-FATAL
          </span>
        </div>
      )}

      {/* Error state card */}
      {error && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Pipeline Execution Interrupted</h4>
              <p className="mt-1 text-xs opacity-90">{error}</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-500 transition focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6 Stage Checklist */}
      <div className="mt-6 space-y-3">
        {CANONICAL_STAGES.map((stage, idx) => {
          const isPast = isCompleted || idx < activeStageIndex;
          const isCurrent = !isCompleted && !error && idx === activeStageIndex;
          const isFuture = !isCompleted && (error ? true : idx > activeStageIndex);

          return (
            <div
              key={stage.id}
              className={`flex items-start gap-3.5 rounded-xl p-3 transition-colors ${
                isCurrent
                  ? 'border border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/30'
                  : isPast
                  ? 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  : 'opacity-50'
              }`}
            >
              {/* Stage Icon */}
              <div className="shrink-0 mt-0.5">
                {isPast ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-400">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Stage Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-indigo-900 dark:text-indigo-300 font-bold'
                        : isPast
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Stream Ticker / Terminal Box */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-950 p-3 text-slate-300 dark:border-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Terminal className="h-3.5 w-3.5 text-indigo-400" />
            <span>Live Orchestrator Signal Stream</span>
          </div>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Real-time SSE
          </span>
        </div>

        <div className="mt-2 font-mono text-[11px] leading-relaxed max-h-24 overflow-y-auto space-y-1">
          {logs.length > 0 ? (
            logs.slice(-4).map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-500 select-none">&gt;</span>
                <span className="text-emerald-400">
                  [{log.timestamp.split('T')[1]?.slice(0, 8) || 'now'}]
                </span>
                <span className="text-slate-200 break-words">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-2 text-slate-500 italic">
              <span>&gt;</span>
              <span>Waiting for initial orchestrator heartbeat...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
