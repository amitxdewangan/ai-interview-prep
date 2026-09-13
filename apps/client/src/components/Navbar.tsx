'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import {
  BrainCircuit,
  LayoutDashboard,
  PlusCircle,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, theme, toggleTheme } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 transition hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span className="flex items-center gap-1.5">
            AI PrepKit
            <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
              v1.0
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex md:items-center md:gap-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive('/dashboard')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            href="/generate"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive('/generate')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Create Kit
          </Link>
        </div>

        {/* Right Action Icons & User Status */}
        <div className="hidden md:flex md:items-center md:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle color theme"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span>{user.name || user.email}</span>
              </div>
              <button
                onClick={() => logout()}
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label="Open mobile navigation"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive('/dashboard')
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            <Link
              href="/generate"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive('/generate')
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Create Kit
            </Link>

            <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
              {user ? (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                    {user.name || user.email}
                  </span>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center rounded-lg border border-slate-300 py-1.5 text-sm font-medium dark:border-slate-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center rounded-lg bg-indigo-600 py-1.5 text-sm font-medium text-white"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
