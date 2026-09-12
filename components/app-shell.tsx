"use client";

import { ReactNode } from "react";
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

  const isArabic = language === "ar";

  return (
    <div
      dir="ltr"
      className={`flex min-h-screen w-full bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 ${
        isArabic ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div className="w-64 shrink-0">
        <Sidebar />
      </div>

      <main
        dir={isArabic ? "rtl" : "ltr"}
        className="min-w-0 flex-1 overflow-x-hidden p-8"
      >
        <header
          className={`mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
            isArabic ? "sm:flex-row-reverse" : ""
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

        <TrialGate>{children}</TrialGate>
      </main>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return <AppShellInner {...props} />;
}
