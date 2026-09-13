'use client';

import React, { useState } from 'react';
import { UploadCloud, FileJson, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface BatchUploadAccordionProps {
  onSelectCase: (caseItem: BatchCase) => void;
}

export function BatchUploadAccordion({ onSelectCase }: BatchUploadAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cases, setCases] = useState<BatchCase[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
          throw new Error('Batch JSON must be an array of cases: [{ id, jd, company_url, days }]');
        }

        const validCases: BatchCase[] = [];
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          if (!item.jd || !item.company_url || typeof item.days !== 'number') {
            throw new Error(
              `Case #${i + 1} (${item.id || 'unnamed'}) is missing required fields: jd, company_url, days`
            );
          }
          validCases.push({
            id: item.id || `case-${i + 1}`,
            jd: String(item.jd),
            company_url: String(item.company_url),
            days: Math.min(60, Math.max(1, Math.round(Number(item.days)))),
          });
        }

        if (validCases.length === 0) {
          throw new Error('Uploaded JSON array contains 0 cases.');
        }

        setCases(validCases);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Invalid JSON file format');
        setCases([]);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
      >
        <div className="flex items-center gap-2">
          <UploadCloud className="h-4 w-4 text-indigo-500" />
          <span>Batch Input: Upload Multi-Role JSON (`cases.json`)</span>
          {cases.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {cases.length} loaded
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload a JSON file formatted per Appendix B test inputs to populate and prepare multiple job descriptions quickly.
          </p>

          <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-4 hover:border-indigo-400 cursor-pointer dark:border-slate-700 dark:hover:border-indigo-500 transition bg-white dark:bg-slate-950">
            <FileJson className="h-6 w-6 text-slate-400 mb-1" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {fileName ? fileName : 'Choose JSON file or drag and drop'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">e.g. cases.example.json</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {cases.length > 0 && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Found {cases.length} valid cases: Click any case to load into the form</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {c.id} &bull; {c.company_url}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.days} days &bull; {c.jd.length} chars
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectCase(c)}
                      className="rounded bg-indigo-50 px-2 py-1 font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 transition"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
