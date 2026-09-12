"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";

type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "cancelled";

type Campaign = {
  id: string;
  name: string;
  segment:
    | "vip"
    | "returning"
    | "new"
    | "at_risk";
  channel:
    | "whatsapp"
    | "sms"
    | "email";
  status: CampaignStatus;
  audience_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type ExecutionResult = {
  campaignId: string;
  campaignName: string;
  sent: number;
  failed: number;
  skipped: number;
};

type WhatsAppAutomationType =
  | "welcome"
  | "winback"
  | "post_order"
  | "birthday"
  | "vip"
  | "review_request";

type WhatsAppAutomation = {
  id: string;
  restaurant_id: string;
  name: string;
  type: WhatsAppAutomationType;
  status: "active" | "paused";
  trigger_days: number;
  template_name: string;
  template_language: string;
  daily_limit: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

type WhatsAppRun = {
  id: string;
  automation_id: string;
  customer_id: string;
  status:
    | "pending"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "skipped";
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

type WhatsAppRunResult = {
  automationId: string;
  automationName: string;
  type: string;
  found: number;
  skipped: number;
  sent: number;
  failed: number;
  message?: string;
};

export default function AutomationPage() {
  const supabase = createClient();

  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);

  const [whatsappAutomations, setWhatsappAutomations] =
    useState<WhatsAppAutomation[]>([]);

  const [whatsappRuns, setWhatsappRuns] =
    useState<WhatsAppRun[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [executing, setExecuting] =
    useState(false);

  const [runningAutomationId, setRunningAutomationId] =
    useState("");

  const [savingAutomation, setSavingAutomation] =
    useState(false);

  const [error, setError] =
    useState("");

  const [executionMessage, setExecutionMessage] =
    useState("");

  const [executionResults, setExecutionResults] =
    useState<ExecutionResult[]>([]);

  const [whatsappMessage, setWhatsappMessage] =
    useState("");

  const [whatsappRunResults, setWhatsappRunResults] =
    useState<WhatsAppRunResult[]>([]);

  const [showCreateAutomation, setShowCreateAutomation] =
    useState(false);

  const [automationName, setAutomationName] =
    useState("Win-back Customers");

  const [automationType, setAutomationType] =
    useState<WhatsAppAutomationType>("winback");

  const [triggerDays, setTriggerDays] =
    useState("30");

  const [templateName, setTemplateName] =
    useState("hello_world");

  const [templateLanguage, setTemplateLanguage] =
    useState("en_US");

  const [dailyLimit, setDailyLimit] =
    useState("100");

  const [creating, setCreating] =
    useState(false);

  async function getRestaurantId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(
        "You are not logged in."
      );
    }

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (restaurantError || !restaurant) {
      throw new Error(
        restaurantError?.message ||
          "Restaurant not found."
      );
    }

    return restaurant.id;
  }

  async function loadData(
    showRefreshState = false
  ) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const restaurantId =
        await getRestaurantId();

      const [
        campaignsResult,
        automationsResult,
        runsResult,
      ] = await Promise.all([
        supabase
          .from("campaigns")
          .select(`
            id,
            name,
            segment,
            channel,
            status,
            audience_count,
            scheduled_at,
            sent_at,
            created_at,
            updated_at
          `)
          .eq(
            "restaurant_id",
            restaurantId
          )
          .order("scheduled_at", {
            ascending: true,
            nullsFirst: false,
          }),

        supabase
          .from("whatsapp_automations")
          .select(`
            id,
            restaurant_id,
            name,
            type,
            status,
            trigger_days,
            template_name,
            template_language,
            daily_limit,
            last_run_at,
            created_at,
            updated_at
          `)
          .eq(
            "restaurant_id",
            restaurantId
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from(
            "whatsapp_automation_runs"
          )
          .select(`
            id,
            automation_id,
            customer_id,
            status,
            provider_message_id,
            error_message,
            sent_at,
            created_at
          `)
          .eq(
            "restaurant_id",
            restaurantId
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100),
      ]);

      if (campaignsResult.error) {
        throw new Error(
          campaignsResult.error.message
        );
      }

      if (automationsResult.error) {
        throw new Error(
          automationsResult.error.message
        );
      }

      if (runsResult.error) {
        throw new Error(
          runsResult.error.message
        );
      }

      setCampaigns(
        (campaignsResult.data || []) as Campaign[]
      );

      setWhatsappAutomations(
        (automationsResult.data ||
          []) as WhatsAppAutomation[]
      );

      setWhatsappRuns(
        (runsResult.data ||
          []) as WhatsAppRun[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function runDueCampaignJobs() {
    try {
      setExecuting(true);
      setExecutionMessage("");
      setExecutionResults([]);
      setError("");

      const response = await fetch(
        "/api/campaigns/execute",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data?.error ||
            `Execution failed with status ${response.status}`
        );
      }

      setExecutionResults(
        (data.campaigns ||
          []) as ExecutionResult[]
      );

      if (
        data.status ===
        "NO_DUE_CAMPAIGNS"
      ) {
        setExecutionMessage(
          "No campaigns are due right now."
        );
      } else {
        setExecutionMessage(
          `Execution completed: ${
            data.sent || 0
          } sent, ${
            data.failed || 0
          } failed, ${
            data.skipped || 0
          } skipped.`
        );
      }

      await loadData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Campaign execution failed."
      );
    } finally {
      setExecuting(false);
    }
  }

  async function createWhatsAppAutomation() {
    const cleanName =
      automationName.trim();

    const days =
      Number(triggerDays);

    const limit =
      Number(dailyLimit);

    if (!cleanName) {
      setWhatsappMessage(
        "Automation name is required."
      );
      return;
    }

    if (
      !Number.isFinite(days) ||
      days < 1
    ) {
      setWhatsappMessage(
        "Trigger days must be at least 1."
      );
      return;
    }

    if (
      !Number.isFinite(limit) ||
      limit < 1
    ) {
      setWhatsappMessage(
        "Daily limit must be at least 1."
      );
      return;
    }

    try {
      setCreating(true);
      setWhatsappMessage("");
      setError("");

      const restaurantId =
        await getRestaurantId();

      const {
        error: insertError,
      } = await supabase
        .from(
          "whatsapp_automations"
        )
        .insert({
          restaurant_id:
            restaurantId,
          name: cleanName,
          type: automationType,
          status: "paused",
          trigger_days: Math.floor(days),
          template_name:
            templateName.trim() ||
            "hello_world",
          template_language:
            templateLanguage.trim() ||
            "en_US",
          daily_limit:
            Math.floor(limit),
        });

      if (insertError) {
        throw insertError;
      }

      setWhatsappMessage(
        "WhatsApp automation created."
      );

      setShowCreateAutomation(false);

      setAutomationName(
        "Win-back Customers"
      );

      setAutomationType("winback");
      setTriggerDays("30");
      setTemplateName("hello_world");
      setTemplateLanguage("en_US");
      setDailyLimit("100");

      await loadData(true);
    } catch (err) {
      setWhatsappMessage(
        err instanceof Error
          ? err.message
          : "Could not create automation."
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleWhatsAppAutomation(
    automation: WhatsAppAutomation
  ) {
    try {
      setError("");

      const nextStatus =
        automation.status === "active"
          ? "paused"
          : "active";

      const {
        error: updateError,
      } = await supabase
        .from(
          "whatsapp_automations"
        )
        .update({
          status: nextStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          automation.id
        );

      if (updateError) {
        throw updateError;
      }

      setWhatsappAutomations(
        (current) =>
          current.map((item) =>
            item.id === automation.id
              ? {
                  ...item,
                  status: nextStatus,
                }
              : item
          )
      );

      setWhatsappMessage(
        nextStatus === "active"
          ? `${automation.name} is now active.`
          : `${automation.name} is paused.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update automation."
      );
    }
  }

  async function runWhatsAppAutomation(
    automationId: string
  ) {
    try {
      setRunningAutomationId(
        automationId
      );

      setWhatsappMessage("");
      setWhatsappRunResults([]);
      setError("");

      const response =
        await fetch(
          "/api/whatsapp/automation/run",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              automationId,
            }),
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            `Automation failed with status ${response.status}`
        );
      }

      const results =
        (data.results ||
          []) as WhatsAppRunResult[];

      setWhatsappRunResults(
        results
      );

      if (
        results.length === 0
      ) {
        setWhatsappMessage(
          "No automation was ready to run."
        );
      } else {
        const result =
          results[0];

        setWhatsappMessage(
          `${result.automationName}: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`
        );
      }

      await loadData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "WhatsApp automation failed."
      );
    } finally {
      setRunningAutomationId("");
    }
  }

  async function deleteWhatsAppAutomation(
    automationId: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this WhatsApp automation?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const {
        error: deleteError,
      } = await supabase
        .from(
          "whatsapp_automations"
        )
        .delete()
        .eq(
          "id",
          automationId
        );

      if (deleteError) {
        throw deleteError;
      }

      setWhatsappAutomations(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              automationId
          )
      );

      setWhatsappRuns(
        (current) =>
          current.filter(
            (item) =>
              item.automation_id !==
              automationId
          )
      );

      setWhatsappMessage(
        "WhatsApp automation deleted."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete automation."
      );
    }
  }

  useEffect(() => {
    loadData();

    const interval =
      window.setInterval(() => {
        loadData(true);
      }, 30000);

    return () =>
      window.clearInterval(
        interval
      );
  }, []);

  const jobs = useMemo(() => {
    const now = Date.now();

    const scheduled =
      campaigns.filter(
        (campaign) =>
          campaign.status ===
          "scheduled"
      );

    const ready =
      scheduled.filter(
        (campaign) =>
          campaign.scheduled_at &&
          new Date(
            campaign.scheduled_at
          ).getTime() <= now
      );

    const upcoming =
      scheduled.filter(
        (campaign) =>
          campaign.scheduled_at &&
          new Date(
            campaign.scheduled_at
          ).getTime() > now
      );

    const completed =
      campaigns.filter(
        (campaign) =>
          campaign.status === "sent"
      );

    return {
      scheduled,
      ready,
      upcoming,
      completed,
    };
  }, [campaigns]);

  const whatsappStats =
    useMemo(() => {
      const active =
        whatsappAutomations.filter(
          (item) =>
            item.status === "active"
        ).length;

      const sent =
        whatsappRuns.filter(
          (run) =>
            run.status === "sent" ||
            run.status === "delivered" ||
            run.status === "read"
        ).length;

      const failed =
        whatsappRuns.filter(
          (run) =>
            run.status === "failed"
        ).length;

      const skipped =
        whatsappRuns.filter(
          (run) =>
            run.status === "skipped"
        ).length;

      return {
        total:
          whatsappAutomations.length,
        active,
        sent,
        failed,
        skipped,
      };
    }, [
      whatsappAutomations,
      whatsappRuns,
    ]);

  function getSegmentLabel(
    segment:
      | "vip"
      | "returning"
      | "new"
      | "at_risk"
  ) {
    switch (segment) {
      case "vip":
        return "VIP";

      case "returning":
        return "Returning";

      case "new":
        return "New";

      case "at_risk":
        return "At Risk";
    }
  }

  function getChannelLabel(
    channel:
      | "whatsapp"
      | "sms"
      | "email"
  ) {
    switch (channel) {
      case "whatsapp":
        return "WhatsApp";

      case "sms":
        return "SMS";

      case "email":
        return "Email";
    }
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Not scheduled";
    }

    return new Date(
      date
    ).toLocaleString();
  }

  function formatLastRun(
    date: string | null
  ) {
    if (!date) {
      return "Never";
    }

    return new Date(
      date
    ).toLocaleString();
  }

  function getJobState(
    campaign: Campaign
  ) {
    if (
      campaign.status ===
      "sent"
    ) {
      return {
        label: "Completed",
        className:
          "bg-green-100 text-green-700",
      };
    }

    if (
      campaign.status ===
      "cancelled"
    ) {
      return {
        label: "Cancelled",
        className:
          "bg-red-100 text-red-700",
      };
    }

    if (
      campaign.status !==
      "scheduled"
    ) {
      return {
        label: "Not Queued",
        className:
          "bg-gray-100 text-gray-700",
      };
    }

    if (!campaign.scheduled_at) {
      return {
        label:
          "Missing Schedule",
        className:
          "bg-yellow-100 text-yellow-700",
      };
    }

    const scheduledTime =
      new Date(
        campaign.scheduled_at
      ).getTime();

    if (
      scheduledTime <=
      Date.now()
    ) {
      return {
        label: "Ready",
        className:
          "bg-orange-100 text-orange-700",
      };
    }

    return {
      label: "Upcoming",
      className:
        "bg-blue-100 text-blue-700",
    };
  }

  function getAutomationTypeLabel(
    type: WhatsAppAutomationType
  ) {
    switch (type) {
      case "welcome":
        return "Welcome";

      case "winback":
        return "Win-back";

      case "post_order":
        return "Post-order";

      case "birthday":
        return "Birthday";

      case "vip":
        return "VIP";

      case "review_request":
        return "Review Request";
    }
  }

  if (loading) {
    return (
      <AppShell title="Automation">
        <div className="rounded-2xl border bg-white p-6 text-gray-500 shadow-sm">
          Loading automation center...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Automation">
      <div className="space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Growth OS
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Automation Center
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Run campaigns and automate customer retention through WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadData(true)
            }
            disabled={refreshing}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <strong>Error:</strong>{" "}
            {error}
          </div>
        )}

        {/* WhatsApp Automation */}
        <section className="rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  WhatsApp Automation
                </p>

                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  Customer Retention Engine
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Automatically reach customers who are becoming inactive.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateAutomation(
                    (current) => !current
                  )
                }
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                {showCreateAutomation
                  ? "Close"
                  : "+ Create Automation"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-4">

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs text-green-700">
                Total Automations
              </p>

              <p className="mt-2 text-2xl font-bold text-green-900">
                {whatsappStats.total}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs text-blue-700">
                Active
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-900">
                {whatsappStats.active}
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-xs text-purple-700">
                Sent
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-900">
                {whatsappStats.sent}
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-xs text-red-700">
                Failed
              </p>

              <p className="mt-2 text-2xl font-bold text-red-900">
                {whatsappStats.failed}
              </p>
            </div>
          </div>

          {showCreateAutomation && (
            <div className="border-t bg-gray-50 p-6">

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Automation Name
                  </label>

                  <input
                    value={automationName}
                    onChange={(e) =>
                      setAutomationName(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
                    placeholder="Win-back Customers"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Type
                  </label>

                  <select
                    value={automationType}
                    onChange={(e) =>
                      setAutomationType(
                        e.target.value as WhatsAppAutomationType
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
                  >
                    <option value="winback">
                      Win-back
                    </option>

                    <option value="welcome">
                      Welcome
                    </option>

                    <option value="post_order">
                      Post-order
                    </option>

                    <option value="birthday">
                      Birthday
                    </option>

                    <option value="vip">
                      VIP
                    </option>

                    <option value="review_request">
                      Review Request
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Trigger Days
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={triggerDays}
                    onChange={(e) =>
                      setTriggerDays(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Template Name
                  </label>

                  <input
                    value={templateName}
                    onChange={(e) =>
                      setTemplateName(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Template Language
                  </label>

                  <input
                    value={templateLanguage}
                    onChange={(e) =>
                      setTemplateLanguage(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Daily Limit
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={dailyLimit}
                    onChange={(e) =>
                      setDailyLimit(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">

                <button
                  type="button"
                  onClick={
                    createWhatsAppAutomation
                  }
                  disabled={creating}
                  className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating
                    ? "Creating..."
                    : "Create Automation"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateAutomation(
                      false
                    )
                  }
                  className="rounded-lg border bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

              </div>

              {whatsappMessage && (
                <p className="mt-3 text-sm text-gray-600">
                  {whatsappMessage}
                </p>
              )}

            </div>
          )}

          {whatsappAutomations.length === 0 ? (
            <div className="border-t p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
                💬
              </div>

              <h4 className="mt-4 font-semibold text-gray-900">
                No WhatsApp automations yet
              </h4>

              <p className="mt-1 text-sm text-gray-500">
                Create your first Win-back automation to start retaining customers automatically.
              </p>

            </div>
          ) : (
            <div className="divide-y">

              {whatsappAutomations.map(
                (automation) => {

                  const automationRuns =
                    whatsappRuns.filter(
                      (run) =>
                        run.automation_id ===
                        automation.id
                    );

                  const sent =
                    automationRuns.filter(
                      (run) =>
                        run.status ===
                          "sent" ||
                        run.status ===
                          "delivered" ||
                        run.status ===
                          "read"
                    ).length;

                  const failed =
                    automationRuns.filter(
                      (run) =>
                        run.status ===
                        "failed"
                    ).length;

                  const skipped =
                    automationRuns.filter(
                      (run) =>
                        run.status ===
                        "skipped"
                    ).length;

                  return (
                    <div
                      key={
                        automation.id
                      }
                      className="p-6"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <h4 className="font-semibold text-gray-900">
                              {
                                automation.name
                              }
                            </h4>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                automation.status ===
                                "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {
                                automation.status
                              }
                            </span>

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                              {getAutomationTypeLabel(
                                automation.type
                              )}
                            </span>

                          </div>

                          <p className="mt-2 text-sm text-gray-500">
                            Trigger after{" "}
                            <strong>
                              {
                                automation.trigger_days
                              }{" "}
                              days
                            </strong>{" "}
                            · Template{" "}
                            <strong>
                              {
                                automation.template_name
                              }
                            </strong>{" "}
                            ·{" "}
                            {
                              automation.daily_limit
                            }{" "}
                            / day
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Last run:{" "}
                            {formatLastRun(
                              automation.last_run_at
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              runWhatsAppAutomation(
                                automation.id
                              )
                            }
                            disabled={
                              runningAutomationId ===
                              automation.id
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {runningAutomationId ===
                            automation.id
                              ? "Running..."
                              : "▶ Run Now"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleWhatsAppAutomation(
                                automation
                              )
                            }
                            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {automation.status ===
                            "active"
                              ? "Pause"
                              : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteWhatsAppAutomation(
                                automation.id
                              )
                            }
                            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>

                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">

                        <div className="rounded-xl bg-green-50 p-4">
                          <p className="text-xs text-green-700">
                            Sent
                          </p>

                          <p className="mt-2 text-xl font-bold text-green-900">
                            {sent}
                          </p>
                        </div>

                        <div className="rounded-xl bg-red-50 p-4">
                          <p className="text-xs text-red-700">
                            Failed
                          </p>

                          <p className="mt-2 text-xl font-bold text-red-900">
                            {failed}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-4">
                          <p className="text-xs text-gray-600">
                            Skipped
                          </p>

                          <p className="mt-2 text-xl font-bold text-gray-900">
                            {skipped}
                          </p>
                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

          {whatsappRunResults.length > 0 && (
            <div className="border-t bg-blue-50 p-6">

              <h4 className="font-semibold text-blue-900">
                Latest WhatsApp Automation Run
              </h4>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-blue-200 text-blue-700">
                    <tr>
                      <th className="px-3 py-3">
                        Automation
                      </th>

                      <th className="px-3 py-3">
                        Found
                      </th>

                      <th className="px-3 py-3">
                        Sent
                      </th>

                      <th className="px-3 py-3">
                        Failed
                      </th>

                      <th className="px-3 py-3">
                        Skipped
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {whatsappRunResults.map(
                      (result) => (
                        <tr
                          key={
                            result.automationId
                          }
                          className="border-b border-blue-100 last:border-0"
                        >
                          <td className="px-3 py-3 font-medium text-gray-900">
                            {
                              result.automationName
                            }
                          </td>

                          <td className="px-3 py-3">
                            {result.found}
                          </td>

                          <td className="px-3 py-3 font-semibold text-green-700">
                            {result.sent}
                          </td>

                          <td className="px-3 py-3 font-semibold text-red-700">
                            {result.failed}
                          </td>

                          <td className="px-3 py-3 text-gray-700">
                            {result.skipped}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </section>

        {/* Campaign Automation */}
        <section className="rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="text-sm font-medium text-blue-600">
                  Campaign Automation
                </p>

                <h3 className="mt-1 text-xl font-semibold text-gray-900">
                  Scheduled Campaigns
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Monitor scheduled campaigns and execute due delivery jobs.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  runDueCampaignJobs
                }
                disabled={
                  executing ||
                  jobs.ready.length ===
                    0
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {executing
                  ? "Running..."
                  : "▶ Run Due Jobs"}
              </button>

            </div>

          </div>

          <div className="grid gap-5 p-6 md:grid-cols-4">

            <div className="rounded-xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Upcoming
              </p>

              <h3 className="mt-2 text-3xl font-bold text-blue-600">
                {
                  jobs.upcoming
                    .length
                }
              </h3>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Ready
              </p>

              <h3 className="mt-2 text-3xl font-bold text-orange-600">
                {
                  jobs.ready
                    .length
                }
              </h3>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Completed
              </p>

              <h3 className="mt-2 text-3xl font-bold text-green-600">
                {
                  jobs.completed
                    .length
                }
              </h3>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Total Queue
              </p>

              <h3 className="mt-2 text-3xl font-bold text-purple-600">
                {
                  jobs.scheduled
                    .length
                }
              </h3>
            </div>

          </div>

          {executionMessage && (
            <div className="mx-6 mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">

              <h4 className="font-semibold text-blue-900">
                Campaign Execution Result
              </h4>

              <p className="mt-1 text-sm text-blue-800">
                {
                  executionMessage
                }
              </p>

              {executionResults.length >
                0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">

                    <thead className="border-b border-blue-200 text-blue-700">
                      <tr>
                        <th className="px-3 py-3">
                          Campaign
                        </th>

                        <th className="px-3 py-3">
                          Sent
                        </th>

                        <th className="px-3 py-3">
                          Failed
                        </th>

                        <th className="px-3 py-3">
                          Skipped
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {executionResults.map(
                        (result) => (
                          <tr
                            key={
                              result.campaignId
                            }
                            className="border-b border-blue-100 last:border-0"
                          >
                            <td className="px-3 py-3 font-medium text-gray-900">
                              {
                                result.campaignName
                              }
                            </td>

                            <td className="px-3 py-3 font-semibold text-green-700">
                              {
                                result.sent
                              }
                            </td>

                            <td className="px-3 py-3 font-semibold text-red-700">
                              {
                                result.failed
                              }
                            </td>

                            <td className="px-3 py-3">
                              {
                                result.skipped
                              }
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>

                  </table>
                </div>
              )}

            </div>
          )}

          <div className="border-t">

            {jobs.scheduled.length ===
            0 ? (
              <div className="p-12 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                  ⚙️
                </div>

                <h4 className="mt-4 font-semibold text-gray-900">
                  Queue is empty
                </h4>

                <p className="mt-1 text-sm text-gray-500">
                  Schedule a campaign to add a job here.
                </p>

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full text-left">

                  <thead className="border-b bg-gray-50 text-sm text-gray-500">
                    <tr>
                      <th className="px-6 py-4">
                        Campaign
                      </th>

                      <th className="px-6 py-4">
                        Channel
                      </th>

                      <th className="px-6 py-4">
                        Audience
                      </th>

                      <th className="px-6 py-4">
                        Scheduled For
                      </th>

                      <th className="px-6 py-4">
                        State
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {
                      [...jobs.scheduled]
                        .sort(
                          (a, b) => {
                            const aTime =
                              a.scheduled_at
                                ? new Date(
                                    a.scheduled_at
                                  ).getTime()
                                : Number.MAX_SAFE_INTEGER;

                            const bTime =
                              b.scheduled_at
                                ? new Date(
                                    b.scheduled_at
                                  ).getTime()
                                : Number.MAX_SAFE_INTEGER;

                            return (
                              aTime -
                              bTime
                            );
                          }
                        )
                        .map(
                          (
                            campaign
                          ) => {

                            const state =
                              getJobState(
                                campaign
                              );

                            return (
                              <tr
                                key={
                                  campaign.id
                                }
                                className="border-b last:border-0 hover:bg-gray-50"
                              >

                                <td className="px-6 py-4">
                                  <p className="font-medium text-gray-900">
                                    {
                                      campaign.name
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-gray-400">
                                    {
                                      getSegmentLabel(
                                        campaign.segment
                                      )
                                    }
                                  </p>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {
                                    getChannelLabel(
                                      campaign.channel
                                    )
                                  }
                                </td>

                                <td className="px-6 py-4">
                                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                                    {
                                      campaign.audience_count
                                    }{" "}
                                    recipients
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {
                                    formatDate(
                                      campaign.scheduled_at
                                    )
                                  }
                                </td>

                                <td className="px-6 py-4">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${state.className}`}
                                  >
                                    {
                                      state.label
                                    }
                                  </span>
                                </td>

                              </tr>
                            );
                          }
                        )
                    }
                  </tbody>

                </table>

              </div>
            )}

          </div>
        </section>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">

          <div className="flex gap-4">

            <div className="text-xl">
              ✅
            </div>

            <div>
              <h3 className="font-semibold text-green-900">
                Automation engine status
              </h3>

              <p className="mt-1 text-sm leading-6 text-green-800">
                Campaign scheduling, WhatsApp automation, delivery tracking, and retention workflows are connected. SMS and Email remain provider-dependent.
              </p>
            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}