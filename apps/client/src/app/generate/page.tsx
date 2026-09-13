'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, type SseProgressEvent } from '@/lib/api';
import { GenerationProgress, type SseLogEntry } from '@/components/progress/GenerationProgress';
import { BatchUploadAccordion, type BatchCase } from '@/components/batch/BatchUploadAccordion';
import {
  Sparkles,
  Globe,
  Calendar,
  FileText,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';

export default function GeneratePage() {
  const router = useRouter();

  // Form state
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    jd?: string;
    companyUrl?: string;
    days?: string;
  }>({});

  // Generation execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('validating');
  const [statusText, setStatusText] = useState<string>('Initializing pipeline...');
  const [logs, setLogs] = useState<SseLogEntry[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [createdKitId, setCreatedKitId] = useState<string | null>(null);

  // Cleanup ref for active SSE subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    const errors: { jd?: string; companyUrl?: string; days?: string } = {};

    if (!jd.trim()) {
      errors.jd = 'Job Description is required.';
    } else if (jd.trim().length < 20) {
      errors.jd = 'Please provide a realistic job description (at least 20 characters).';
    }

    if (!companyUrl.trim()) {
      errors.companyUrl = 'Company website URL is required.';
    } else {
      try {
        const urlToTest = companyUrl.startsWith('http://') || companyUrl.startsWith('https://')
          ? companyUrl
          : `https://${companyUrl}`;
        new URL(urlToTest);
      } catch {
        errors.companyUrl = 'Please enter a valid URL (e.g., https://stripe.com).';
      }
    }

    if (!Number.isInteger(days) || days < 1 || days > 60) {
      errors.days = 'Days must be an integer between 1 and 60.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStartGeneration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    // Format companyUrl with protocol if missing
    const formattedUrl =
      companyUrl.startsWith('http://') || companyUrl.startsWith('https://')
        ? companyUrl
        : `https://${companyUrl}`;

    setIsGenerating(true);
    setGenerationError(null);
    setIsCompleted(false);
    setCreatedKitId(null);
    setLogs([]);
    setCurrentStep('validating');
    setStatusText('Validating input parameters and connecting to orchestrator...');

    try {
      const { sessionId: newSessionId } = await api.startGeneration({
        jd: jd.trim(),
        company_url: formattedUrl,
        days: Math.round(days),
      });

      setSessionId(newSessionId);

      // Subscribe to Server-Sent Events
      const unsubscribe = api.subscribeProgress(
        newSessionId,
        (event: SseProgressEvent) => {
          setCurrentStep(event.step);
          setStatusText(event.message);
          setLogs((prev) => [
            ...prev,
            {
              timestamp: event.timestamp || new Date().toISOString(),
              message: event.message,
              step: event.step,
            },
          ]);

          if (event.step === 'completed') {
            setIsCompleted(true);
            setIsGenerating(false);
            if (event.data?.kitId) {
              setCreatedKitId(event.data.kitId);
            }
          } else if (event.step === 'failed') {
            setGenerationError(event.data?.error || event.message || 'Generation failed');
            setIsGenerating(false);
          }
        },
        (err: Error) => {
          // If already completed, ignore disconnect errors
          if (!isCompleted) {
            setGenerationError(err.message || 'Lost connection to generation stream');
            setIsGenerating(false);
          }
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to launch generation job';
      setGenerationError(msg);
      setIsGenerating(false);
    }
  };

  const handleBatchCaseLoaded = (caseItem: BatchCase) => {
    setJd(caseItem.jd);
    setCompanyUrl(caseItem.company_url);
    setDays(caseItem.days);
    setValidationErrors({});
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Hero Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          Autonomous Multi-Step Generation
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Create AI Interview Prep Kit
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste the job description and target company website. Our pipeline crawls public signals,
          extracts must-haves, closes coverage gaps with a second pass, and constructs your personalized timeline.
        </p>
      </div>

      {/* Main Generation Flow */}
      {isGenerating || isCompleted || generationError ? (
        <div className="space-y-6">
          <GenerationProgress
            currentStatusText={statusText}
            currentStep={currentStep}
            logs={logs}
            error={generationError}
            isCompleted={isCompleted}
            onRetry={handleStartGeneration}
          />

          {/* Completion Call-to-Action Card */}
          {isCompleted && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-100">
                    Prep Kit Ready & Validated!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    All requirements processed and verified against Appendix A specification.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (createdKitId) {
                      router.push(`/kit/${createdKitId}`);
                    } else {
                      router.push('/dashboard');
                    }
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-500 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <span>Open Prep Kit</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCompleted(false);
                    setIsGenerating(false);
                    setSessionId(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  New Kit
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Form Inputs */
        <form onSubmit={handleStartGeneration} className="space-y-6">
          {/* Batch Upload Accordion */}
          <BatchUploadAccordion onSelectCase={handleBatchCaseLoaded} />

          {/* Job Description Textarea */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2">
              <label
                htmlFor="jd-input"
                className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                <FileText className="h-4 w-4 text-indigo-500" />
                Job Description (JD)
              </label>
              <span
                className={`text-xs font-mono ${
                  jd.length > 0 ? 'text-slate-600 dark:text-slate-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {jd.length} characters
              </span>
            </div>

            <textarea
              id="jd-input"
              rows={8}
              value={jd}
              onChange={(e) => {
                setJd(e.target.value);
                if (validationErrors.jd) setValidationErrors((prev) => ({ ...prev, jd: undefined }));
              }}
              placeholder="Paste the full job description here (e.g. responsibilities, requirements, qualifications)..."
              className={`w-full rounded-xl border p-3.5 text-sm font-mono leading-relaxed transition focus:outline-none focus:ring-2 dark:bg-slate-950 ${
                validationErrors.jd
                  ? 'border-rose-400 focus:ring-rose-400 dark:border-rose-500'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-800'
              }`}
            />
            {validationErrors.jd && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {validationErrors.jd}
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Tip: Even thin 2-line JDs are supported honestly without hallucinated requirements.
            </p>
          </div>

          {/* Target Company URL & Days Available Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Target Company URL */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <label
                htmlFor="url-input"
                className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-2"
              >
                <Globe className="h-4 w-4 text-indigo-500" />
                Company Website URL
              </label>
              <input
                id="url-input"
                type="text"
                value={companyUrl}
                onChange={(e) => {
                  setCompanyUrl(e.target.value);
                  if (validationErrors.companyUrl) {
                    setValidationErrors((prev) => ({ ...prev, companyUrl: undefined }));
                  }
                }}
                placeholder="https://company.com"
                className={`w-full rounded-xl border p-3 text-sm transition focus:outline-none focus:ring-2 dark:bg-slate-950 ${
                  validationErrors.companyUrl
                    ? 'border-rose-400 focus:ring-rose-400 dark:border-rose-500'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-800'
                }`}
              />
              {validationErrors.companyUrl && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {validationErrors.companyUrl}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Used for BFS crawl of careers, handbook, and interview discussions.
              </p>
            </div>

            {/* Days Available Slider & Number */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="days-input"
                  className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"
                >
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  Preparation Timeline
                </label>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  {days} {days === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              <div className="space-y-3">
                <input
                  id="days-slider"
                  type="range"
                  min="1"
                  max="60"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                  aria-label="Preparation days slider"
                />

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>1 day (Intensive)</span>
                  <div className="flex items-center gap-1.5">
                    <span>Direct:</span>
                    <input
                      id="days-input"
                      type="number"
                      min="1"
                      max="60"
                      value={days}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setDays(Math.min(60, Math.max(1, val)));
                      }}
                      className="w-16 rounded-lg border border-slate-200 p-1 text-center font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    />
                  </div>
                  <span>60 days (Paced)</span>
                </div>
              </div>

              {validationErrors.days && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {validationErrors.days}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Algorithmically distributed across exact days with integer minutes.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:shadow-indigo-500/35 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            >
              <Sparkles className="h-5 w-5" />
              <span>Launch Autonomous Kit Generation</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
