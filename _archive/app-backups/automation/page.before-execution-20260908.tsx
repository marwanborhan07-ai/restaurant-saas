"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase";

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

export default function AutomationPage() {
  const [campaigns, setCampaigns] = useState<
    Campaign[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function getRestaurantId(
    supabase: ReturnType<typeof createClient>
  ) {
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

  async function loadCampaigns() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const restaurantId =
        await getRestaurantId(supabase);

      const {
        data,
        error: campaignsError,
      } = await supabase
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
        });

      if (campaignsError) {
        throw new Error(
          campaignsError.message
        );
      }

      setCampaigns(
        (data || []) as Campaign[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();

    const interval =
      window.setInterval(() => {
        loadCampaigns();
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
          campaign.status === "scheduled"
      );

    const ready = scheduled.filter(
      (campaign) =>
        campaign.scheduled_at &&
        new Date(
          campaign.scheduled_at
        ).getTime() <= now
    );

    const upcoming = scheduled.filter(
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

    const cancelled =
      campaigns.filter(
        (campaign) =>
          campaign.status === "cancelled"
      );

    return {
      scheduled,
      ready,
      upcoming,
      completed,
      cancelled,
    };
  }, [campaigns]);

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

  function getJobState(
    campaign: Campaign
  ) {
    if (campaign.status === "sent") {
      return {
        label: "Completed",
        className:
          "bg-green-100 text-green-700",
      };
    }

    if (
      campaign.status === "cancelled"
    ) {
      return {
        label: "Cancelled",
        className:
          "bg-red-100 text-red-700",
      };
    }

    if (
      campaign.status !== "scheduled"
    ) {
      return {
        label: "Not Queued",
        className:
          "bg-gray-100 text-gray-700",
      };
    }

    if (!campaign.scheduled_at) {
      return {
        label: "Missing Schedule",
        className:
          "bg-yellow-100 text-yellow-700",
      };
    }

    const scheduledTime =
      new Date(
        campaign.scheduled_at
      ).getTime();

    if (
      scheduledTime <= Date.now()
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

  if (loading) {
    return (
      <AppShell title="Automation">
        <div className="rounded-2xl border bg-white p-6 text-gray-500 shadow-sm">
          Loading automation queue...
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Automation">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          <strong>Error:</strong>{" "}
          {error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Automation">
      <div className="space-y-6">

        {/* Header */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <h2 className="text-xl font-semibold text-gray-900">
              Automation Center
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Monitor scheduled campaigns and the execution queue.
            </p>

          </div>


          <button
            onClick={loadCampaigns}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh Queue
          </button>

        </div>


        {/* KPI Cards */}

        <div className="grid gap-5 md:grid-cols-4">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Upcoming
            </p>

            <h3 className="mt-2 text-3xl font-bold text-blue-600">
              {jobs.upcoming.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              Scheduled for later
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Ready
            </p>

            <h3 className="mt-2 text-3xl font-bold text-orange-600">
              {jobs.ready.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              Waiting for delivery engine
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Completed
            </p>

            <h3 className="mt-2 text-3xl font-bold text-green-600">
              {jobs.completed.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              Marked as sent
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Queue
            </p>

            <h3 className="mt-2 text-3xl font-bold text-purple-600">
              {jobs.scheduled.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              Scheduled campaigns
            </p>

          </div>

        </div>


        {/* Ready Queue */}

        <div className="rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-lg font-semibold text-gray-900">
              Execution Queue
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Campaigns that are due or approaching their scheduled time.
            </p>

          </div>


          {jobs.scheduled.length === 0 ? (

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

                  {[...jobs.scheduled]
                    .sort((a, b) => {
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

                      return aTime - bTime;
                    })
                    .map(
                      (campaign) => {
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
                    )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* Ready Jobs */}

        <div className="grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border bg-white shadow-sm">

            <div className="border-b p-6">

              <h3 className="text-lg font-semibold text-gray-900">
                Ready Jobs
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Campaigns whose scheduled time has arrived.
              </p>

            </div>


            {jobs.ready.length === 0 ? (

              <div className="p-8 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-xl">
                  ✓
                </div>

                <p className="mt-3 font-medium text-gray-900">
                  No jobs ready
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Nothing is waiting for execution right now.
                </p>

              </div>

            ) : (

              <div className="divide-y">

                {jobs.ready.map(
                  (campaign) => (

                    <div
                      key={
                        campaign.id
                      }
                      className="p-5"
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <p className="font-medium text-gray-900">
                            {
                              campaign.name
                            }
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {
                              campaign.audience_count
                            }{" "}
                            recipients ·{" "}
                            {
                              getChannelLabel(
                                campaign.channel
                              )
                            }
                          </p>

                        </div>


                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                          Ready
                        </span>

                      </div>


                      <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">

                        <p className="text-xs leading-5 text-yellow-800">
                          Delivery engine is not connected yet. This job is ready for provider execution.
                        </p>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>


          {/* Upcoming */}

          <div className="rounded-2xl border bg-white shadow-sm">

            <div className="border-b p-6">

              <h3 className="text-lg font-semibold text-gray-900">
                Upcoming Jobs
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Scheduled campaigns waiting for their execution time.
              </p>

            </div>


            {jobs.upcoming.length === 0 ? (

              <div className="p-8 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl">
                  🕒
                </div>

                <p className="mt-3 font-medium text-gray-900">
                  No upcoming jobs
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Schedule a future campaign from Campaigns.
                </p>

              </div>

            ) : (

              <div className="divide-y">

                {jobs.upcoming
                  .slice(0, 5)
                  .map(
                    (campaign) => (

                      <div
                        key={
                          campaign.id
                        }
                        className="p-5"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <p className="font-medium text-gray-900">
                              {
                                campaign.name
                              }
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {
                                getSegmentLabel(
                                  campaign.segment
                                )
                              }{" "}
                              ·{" "}
                              {
                                campaign.audience_count
                              }{" "}
                              recipients
                            </p>

                          </div>


                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            Upcoming
                          </span>

                        </div>


                        <p className="mt-3 text-sm font-medium text-gray-700">
                          {formatDate(
                            campaign.scheduled_at
                          )}
                        </p>

                      </div>

                    )
                  )}

              </div>

            )}

          </div>

        </div>


        {/* System Notice */}

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

          <div className="flex gap-4">

            <div className="text-xl">
              ⚙️
            </div>

            <div>

              <h3 className="font-semibold text-yellow-900">
                Automation engine status
              </h3>

              <p className="mt-1 text-sm leading-6 text-yellow-800">
                Campaign scheduling and queue detection are active. Actual WhatsApp, SMS, and Email delivery is not connected yet, so Ready jobs are not marked as Sent automatically.
              </p>

            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}