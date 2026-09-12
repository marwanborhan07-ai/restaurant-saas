"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TrialData = {
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

function getRemainingMs(target: string | null) {
  if (!target) return 0;

  return Math.max(
    0,
    new Date(target).getTime() - Date.now()
  );
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(
    totalSeconds / 86400
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
  };
}

export function TrialStatusCard() {
  const [trial, setTrial] =
    useState<TrialData | null>(null);

  const [remaining, setRemaining] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function loadTrial() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      const {
        data: restaurant,
        error,
      } = await supabase
        .from("restaurants")
        .select(
          "trial_started_at, trial_ends_at"
        )
        .eq("owner_id", user.id)
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      if (
        !error &&
        restaurant &&
        active
      ) {
        const data = {
          trial_started_at:
            restaurant.trial_started_at,
          trial_ends_at:
            restaurant.trial_ends_at,
        };

        setTrial(data);
        setRemaining(
          getRemainingMs(
            data.trial_ends_at
          )
        );
      }

      if (active) {
        setLoading(false);
      }
    }

    loadTrial();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!trial?.trial_ends_at) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setRemaining(
          getRemainingMs(
            trial.trial_ends_at
          )
        );
      }, 1000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [trial?.trial_ends_at]);

  if (loading) {
    return (
      <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!trial) {
    return null;
  }

  const expired = remaining <= 0;

  if (expired) {
    return (
      <div className="mt-auto rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
        <div className="text-sm font-semibold text-red-700 dark:text-red-300">
          Free trial expired
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              "/billing";
          }}
          className="mt-3 w-full rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
        >
          Upgrade plan
        </button>
      </div>
    );
  }

  const {
    days,
    hours,
    minutes,
    seconds,
  } = formatTime(remaining);

  return (
    <div className="mt-auto rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
      <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">
        Free Trial
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <div className="rounded-lg bg-white/80 px-1 py-2 text-center dark:bg-slate-900/70">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {days}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400">
            days
          </div>
        </div>

        <div className="rounded-lg bg-white/80 px-1 py-2 text-center dark:bg-slate-900/70">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {String(hours).padStart(2, "0")}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400">
            hrs
          </div>
        </div>

        <div className="rounded-lg bg-white/80 px-1 py-2 text-center dark:bg-slate-900/70">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {String(minutes).padStart(2, "0")}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400">
            min
          </div>
        </div>

        <div className="rounded-lg bg-white/80 px-1 py-2 text-center dark:bg-slate-900/70">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {String(seconds).padStart(2, "0")}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400">
            sec
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[10px] text-blue-700 dark:text-blue-400">
        Your 14-day trial is active
      </div>
    </div>
  );
}
