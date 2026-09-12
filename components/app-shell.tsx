"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { TrialGate } from "./trial-gate";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { useLanguage } from "./language-context";

type AppShellProps = {
  title: string;
  titleKey?: string;
  children: ReactNode;
};

function AppShellInner({
  title,
  titleKey,
  children,
}: AppShellProps) {
  const { t, language } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isArabic = language === "ar";

  return (
    <div
      dir="ltr"
      className={`flex min-h-[100dvh] w-full overflow-x-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 ${
        isArabic ? "md:flex-row-reverse" : "md:flex-row"
      }`}
    >
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar */}
      <div className="shrink-0">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main
        dir={isArabic ? "rtl" : "ltr"}
        className="min-w-0 flex-1 overflow-x-hidden"
      >
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1 truncate px-3 text-center text-sm font-bold text-slate-900 dark:text-white">
            Restaurant{" "}
            <span className="text-blue-600 dark:text-blue-400">
              Growth OS
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Desktop Header */}
          <header
            className={`mb-8 hidden items-center justify-between gap-4 md:flex ${
              isArabic ? "flex-row-reverse" : ""
            }`}
          >
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {titleKey ? t(titleKey) : title}
            </h1>

            <div className="flex items-center gap-3">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>

          {/* Mobile Page Title */}
          <header className="mb-6 md:hidden">
            <h1 className="break-words text-2xl font-bold text-slate-900 dark:text-white">
              {titleKey ? t(titleKey) : title}
            </h1>
          </header>

          <TrialGate>{children}</TrialGate>
        </div>
      </main>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return <AppShellInner {...props} />;
}