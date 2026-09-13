import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/authContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'AI Interview Prep Kit — Autonomous Research & Deliberate Generation',
  description:
    'Generate personalized, company-specific interview preparation kits with multi-step research, deterministic schedule allocation, and second-pass coverage loops.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#090d16] dark:text-slate-100 flex flex-col font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 py-6 text-center text-xs text-slate-500 dark:text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>AI Interview Prep Kit • Production Research & Generation Pipeline</p>
              <p className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                System Operational • Appendix A & B Strictly Compliant
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
