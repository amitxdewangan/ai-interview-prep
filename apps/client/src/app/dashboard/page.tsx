'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type KitRecord } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import {
  LayoutDashboard,
  PlusCircle,
  Building2,
  Calendar,
  Layers,
  Trash2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [kits, setKits] = useState<KitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getKits();
      setKits(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load kits';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchKits();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const handleDeleteKit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this preparation kit?')) return;

    try {
      await api.deleteKit(id);
      setKits((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete kit');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
          Sign In to Access Dashboard
        </h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Your preparation kits are securely isolated to your account.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Create New Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Preparation Kits
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your researched kits, customize questions in the Builder, and practice.
          </p>
        </div>

        <Link
          href="/generate"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Prep Kit</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Empty State */}
      {kits.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
            No preparation kits created yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Generate your first kit by pasting any job description and company URL. The multi-step pipeline will construct your questions and timeline.
          </p>
          <div className="mt-6">
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Your First Kit</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Kit Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((kitItem) => {
            const { kit } = kitItem;
            const uncoveredCount = kit.coverage?.uncovered_requirement_ids?.length || 0;
            const totalQuestions = kit.questions?.length || 0;
            const totalRequirements = kit.role?.requirements?.length || 0;

            return (
              <div
                key={kitItem.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{kit.source.company}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteKit(kitItem.id, e)}
                      title="Delete kit"
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {kit.role.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {kit.company_brief?.summary || 'Researched company interview preparation kit.'}
                  </p>

                  {/* Metadata tags */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Calendar className="h-3 w-3" />
                      {kit.schedule.days_available} Days
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Layers className="h-3 w-3" />
                      {totalQuestions} Questions
                    </span>

                    {uncoveredCount === 0 ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        100% Covered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        {uncoveredCount} Gap{uncoveredCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {new Date(kitItem.createdAt).toLocaleDateString()}
                  </span>

                  <Link
                    href={`/kit/${kitItem.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition"
                  >
                    <span>Open Kit</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
