'use client';

import React from 'react';
import type { PracticeFilter } from '@/lib/spacedRepetition';
import { Layers, AlertTriangle, Clock, Trophy } from 'lucide-react';

interface QueueFilterTabsProps {
  activeFilter: PracticeFilter;
  onSelectFilter: (filter: PracticeFilter) => void;
  counts: {
    all: number;
    needs_review: number;
    unseen: number;
    mastered: number;
  };
}

export function QueueFilterTabs({
  activeFilter,
  onSelectFilter,
  counts,
}: QueueFilterTabsProps) {
  const tabs: Array<{
    id: PracticeFilter;
    label: string;
    icon: React.ReactNode;
    count: number;
    badgeColor: string;
  }> = [
    {
      id: 'all',
      label: 'Review Queue',
      icon: <Layers className="h-3.5 w-3.5" />,
      count: counts.all,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      id: 'needs_review',
      label: 'Needs Review',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
      count: counts.needs_review,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'unseen',
      label: 'Unseen',
      icon: <Clock className="h-3.5 w-3.5 text-slate-400" />,
      count: counts.unseen,
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'mastered',
      label: 'Mastered',
      icon: <Trophy className="h-3.5 w-3.5 text-emerald-500" />,
      count: counts.mastered,
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectFilter(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isActive
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                  : tab.badgeColor
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
