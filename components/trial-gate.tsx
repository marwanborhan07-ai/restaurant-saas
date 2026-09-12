"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TrialGateProps = {
  children: ReactNode;
};

type TrialData = {
  trial_ends_at: string | null;
};

const allowedAfterExpiry = ["/billing", "/settings"];

export function TrialGate({ children }: TrialGateProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkTrial() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("trial_ends_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (mounted && !error && restaurant) {
        const trial: TrialData = restaurant;

        const isExpired =
          !trial.trial_ends_at ||
          new Date(trial.trial_ends_at).getTime() <= Date.now();

        setExpired(isExpired);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    checkTrial();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const canAccessAfterExpiry = allowedAfterExpiry.includes(pathname);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-sm text-slate-500">
          Checking subscription...
        </div>
      </div>
    );
  }

  if (expired && !canAccessAfterExpiry) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-2xl">
            🔒
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Your free trial has ended
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
            Your 14-day free trial has expired. Upgrade your plan to continue
            using Restaurant Growth OS.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push("/billing")}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Upgrade Plan
            </button>

            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
