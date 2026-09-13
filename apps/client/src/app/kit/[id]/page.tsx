'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type KitRecord } from '@/lib/api';
import {
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  BookOpen,
} from 'lucide-react';

export default function KitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = typeof params?.id === 'string' ? params.id : '';

  const [kitRecord, setKitRecord] = useState<KitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kitId) return;

    api.getKitById(kitId)
      .then((data) => {
        setKitRecord(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load kit');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [kitId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" />
      </div>
    );
  }

  if (error || !kitRecord) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Preparation Kit</h2>
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error || 'Kit not found'}</p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { kit } = kitRecord;
  const uncoveredCount = kit.coverage?.uncovered_requirement_ids?.length || 0;

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-4 w-4" />
              <span>{kit.source.company}</span>
              <span>&bull;</span>
              <span>{kit.source.location}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {kit.role.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {kit.schedule.days_available} Day Prep Plan
            </span>
          </div>
        </div>
      </div>

      {/* Brief Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          Company Brief
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {kit.company_brief.summary}
        </p>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Core Domain: </span>
          {kit.company_brief.what_they_do}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Layers className="h-4 w-4 text-indigo-500" />
            Requirements Identified
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {kit.role.requirements.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {kit.role.requirements.filter((r) => r.priority === 'must').length} must-haves
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileQuestion className="h-4 w-4 text-purple-500" />
            Tailored Questions
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {kit.questions.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Technical, behavioural, and system design
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Coverage Verification
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {uncoveredCount === 0 ? '100%' : `${kit.role.requirements.length - uncoveredCount}/${kit.role.requirements.length}`}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Second-pass loop passes: {kit.coverage.passes}
          </p>
        </div>
      </div>
    </div>
  );
}
