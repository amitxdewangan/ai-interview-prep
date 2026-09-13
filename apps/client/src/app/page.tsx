import Link from 'next/link';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Repeat,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16 py-6 sm:py-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          Autonomous Interview Research & Prep Engine
        </div>

        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-6xl sm:leading-[1.15]">
          Master Any Job Interview With{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Precision AI Preparation
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          Ingests any Job Description and target company website. Autonomously crawls hiring signals,
          extracts must-have requirements, eliminates coverage gaps through a deterministic second pass,
          and generates your day-by-day practice schedule.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/generate"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:shadow-indigo-500/35 transition active:scale-[0.98]"
          >
            <span>Create Prep Kit</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
          >
            <span>View Saved Kits</span>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Feature 1 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 mb-4">
            <Search className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            BFS Company Crawler
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Discovers careers handbooks, engineering blogs, and public interview discussions with SSRF protections and honest fallbacks.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 mb-4">
            <Repeat className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Second-Pass Coverage Loop
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Deterministically verifies requirement coverage. Automatically acts on uncovered must-haves through targeted re-generation.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 mb-4">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Deterministic Schedule
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Pure algorithmic schedule distribution across exact days (1–60) with integer minutes, scheduling harder questions first.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400 mb-4">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            State-Preserving Builder
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Inline editing, category reordering, and pin toggling. User custom questions survive single-section regenerations.
          </p>
        </div>

        {/* Feature 5 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400 mb-4">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Active Recall Practice
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Interactive 3D flashcards with 4-tier confidence scoring and spaced repetition queue ordering.
          </p>
        </div>

        {/* Feature 6 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 mb-4">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Appendix A & B Verified
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Strict runtime Zod validation, SSRF guardrails, and isolated batch CLI evaluation via `npm run evaluate`.
          </p>
        </div>
      </div>
    </div>
  );
}
