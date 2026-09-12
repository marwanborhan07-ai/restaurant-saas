"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_orders: number | null;
  total_spent: number | null;
  last_order_at: string | null;
};

type AudienceCustomer = Customer & {
  daysSinceLastOrder: number | null;
};

type SegmentKey =
  | "vip"
  | "returning"
  | "new"
  | "at_risk";

type Channel =
  | "whatsapp"
  | "sms"
  | "email";

type Campaign = {
  id: string;
  restaurant_id: string;
  name: string;
  segment: SegmentKey;
  channel: Channel;
  subject: string | null;
  message: string;
  status: string;
  audience_count: number;
  created_at: string;
  updated_at: string;
};

const templates: Record<
  SegmentKey,
  {
    subject: string;
    message: string;
  }
> = {
  vip: {
    subject: "VIP Customer Offer",
    message:
      "Hi {{name}}, thank you for being one of our most valuable customers. We have a special offer waiting for you. We would love to see you again soon!",
  },

  returning: {
    subject: "We'd Love to See You Again",
    message:
      "Hi {{name}}, we noticed you've ordered from us before. We'd love to have you back. Enjoy a special offer on your next order!",
  },

  new: {
    subject: "Welcome Offer",
    message:
      "Hi {{name}}, welcome to our restaurant! We hope you enjoyed your first order. Here is a special reason to come back for your next one.",
  },

  at_risk: {
    subject: "We Miss You",
    message:
      "Hi {{name}}, we haven't seen you in a while. We would love to have you back. Here's a special offer just for you!",
  },
};

export default function CampaignsPage() {
  const [customers, setCustomers] = useState<
    AudienceCustomer[]
  >([]);

  const [campaigns, setCampaigns] = useState<
    Campaign[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [segment, setSegment] =
    useState<SegmentKey>("at_risk");

  const [channel, setChannel] =
    useState<Channel>("whatsapp");

  const [subject, setSubject] = useState(
    templates.at_risk.subject
  );

  const [message, setMessage] = useState(
    templates.at_risk.message
  );

  const [campaignName, setCampaignName] =
    useState("Win-back Campaign");

  const [editingCampaignId, setEditingCampaignId] =
    useState<string | null>(null);

  const [savedMessage, setSavedMessage] =
    useState("");

  async function getRestaurantId(
    supabase: ReturnType<typeof createClient>
  ) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You are not logged in.");
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

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const restaurantId =
        await getRestaurantId(supabase);

      const {
        data: customersData,
        error: customersError,
      } = await supabase
        .from("customers")
        .select(`
          id,
          name,
          email,
          phone,
          total_orders,
          total_spent,
          last_order_at
        `)
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (customersError) {
        throw new Error(
          customersError.message
        );
      }

      const now = new Date();

      const formattedCustomers =
        (customersData || []).map(
          (customer) => {
            let daysSinceLastOrder:
              | number
              | null = null;

            if (customer.last_order_at) {
              const lastOrder =
                new Date(
                  customer.last_order_at
                );

              daysSinceLastOrder =
                Math.max(
                  0,
                  Math.floor(
                    (now.getTime() -
                      lastOrder.getTime()) /
                      (1000 *
                        60 *
                        60 *
                        24)
                  )
                );
            }

            return {
              ...customer,
              daysSinceLastOrder,
            };
          }
        );

      setCustomers(formattedCustomers);

      const {
        data: campaignsData,
        error: campaignsError,
      } = await supabase
        .from("campaigns")
        .select(`
          id,
          restaurant_id,
          name,
          segment,
          channel,
          subject,
          message,
          status,
          audience_count,
          created_at,
          updated_at
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", {
          ascending: false,
        });

      if (campaignsError) {
        throw new Error(
          campaignsError.message
        );
      }

      setCampaigns(
        (campaignsData || []) as Campaign[]
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
    loadData();
  }, []);

  const audiences = useMemo(() => {
    const vip = customers.filter(
      (customer) =>
        Number(
          customer.total_spent || 0
        ) >= 500 ||
        Number(
          customer.total_orders || 0
        ) >= 5
    );

    const returning = customers.filter(
      (customer) => {
        const orders = Number(
          customer.total_orders || 0
        );

        const spent = Number(
          customer.total_spent || 0
        );

        return (
          orders > 1 &&
          spent < 500 &&
          orders < 5
        );
      }
    );

    const newCustomers =
      customers.filter(
        (customer) =>
          Number(
            customer.total_orders || 0
          ) <= 1
      );

    const atRisk = customers.filter(
      (customer) =>
        Number(
          customer.total_orders || 0
        ) > 0 &&
        customer.daysSinceLastOrder !==
          null &&
        customer.daysSinceLastOrder >= 30
    );

    return {
      vip,
      returning,
      newCustomers,
      atRisk,
    };
  }, [customers]);

  const selectedAudience =
    useMemo(() => {
      switch (segment) {
        case "vip":
          return audiences.vip;

        case "returning":
          return audiences.returning;

        case "new":
          return audiences.newCustomers;

        case "at_risk":
          return audiences.atRisk;
      }
    }, [segment, audiences]);

  function changeSegment(
    newSegment: SegmentKey
  ) {
    setSegment(newSegment);

    setSubject(
      templates[newSegment].subject
    );

    setMessage(
      templates[newSegment].message
    );

    setCampaignName(
      newSegment === "at_risk"
        ? "Win-back Campaign"
        : newSegment === "vip"
        ? "VIP Loyalty Campaign"
        : newSegment === "returning"
        ? "Returning Customer Campaign"
        : "New Customer Campaign"
    );

    setEditingCampaignId(null);
    setSavedMessage("");
  }

  function getSegmentLabel(
    segmentValue: SegmentKey
  ) {
    switch (segmentValue) {
      case "vip":
        return "VIP Customers";

      case "returning":
        return "Returning Customers";

      case "new":
        return "New Customers";

      case "at_risk":
        return "At Risk Customers";
    }
  }

  function getChannelLabel(
    channelValue: Channel
  ) {
    switch (channelValue) {
      case "whatsapp":
        return "WhatsApp";

      case "sms":
        return "SMS";

      case "email":
        return "Email";
    }
  }

  function previewMessage() {
    const firstCustomer =
      selectedAudience[0];

    if (!firstCustomer) {
      return message.replace(
        "{{name}}",
        "Customer"
      );
    }

    return message.replace(
      "{{name}}",
      firstCustomer.name
    );
  }

  function openCampaign(
    campaign: Campaign
  ) {
    setEditingCampaignId(campaign.id);
    setCampaignName(campaign.name);
    setSegment(campaign.segment);
    setChannel(campaign.channel);
    setSubject(campaign.subject || "");
    setMessage(campaign.message);
    setSavedMessage("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function startNewCampaign() {
    setEditingCampaignId(null);

    setCampaignName("Win-back Campaign");
    setSegment("at_risk");
    setChannel("whatsapp");
    setSubject(
      templates.at_risk.subject
    );
    setMessage(
      templates.at_risk.message
    );

    setSavedMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveCampaign() {
    if (!campaignName.trim()) {
      alert("Please enter campaign name.");
      return;
    }

    if (!message.trim()) {
      alert("Please enter a campaign message.");
      return;
    }

    try {
      setSaving(true);
      setSavedMessage("");

      const supabase = createClient();

      const restaurantId =
        await getRestaurantId(supabase);

      const payload = {
        restaurant_id: restaurantId,
        name: campaignName.trim(),
        segment,
        channel,
        subject:
          channel === "email"
            ? subject.trim() || null
            : null,
        message: message.trim(),
        status: "draft",
        audience_count:
          selectedAudience.length,
      };

      if (editingCampaignId) {
        const {
          error: updateError,
        } = await supabase
          .from("campaigns")
          .update(payload)
          .eq("id", editingCampaignId)
          .eq(
            "restaurant_id",
            restaurantId
          );

        if (updateError) {
          throw new Error(
            updateError.message
          );
        }

        setSavedMessage(
          "Campaign updated successfully."
        );
      } else {
        const {
          error: insertError,
        } = await supabase
          .from("campaigns")
          .insert(payload);

        if (insertError) {
          throw new Error(
            insertError.message
          );
        }

        setSavedMessage(
          "Campaign saved successfully."
        );
      }

      await loadData();

      window.setTimeout(() => {
        setSavedMessage("");
      }, 3000);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving campaign."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCampaign(
    campaignId: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this campaign draft?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const supabase = createClient();

      const restaurantId =
        await getRestaurantId(supabase);

      const {
        error: deleteError,
      } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId)
        .eq(
          "restaurant_id",
          restaurantId
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      if (
        editingCampaignId === campaignId
      ) {
        startNewCampaign();
      }

      await loadData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting campaign."
      );
    }
  }

  if (loading) {
    return (
      <AppShell title="Campaigns">
        <div className="rounded-2xl border bg-white p-6 text-gray-500 shadow-sm">
          Loading campaign center...
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Campaigns">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          <strong>Error:</strong>{" "}
          {error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Campaigns">
      <div className="space-y-6">

        {/* Header */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <h2 className="text-xl font-semibold text-gray-900">
              Campaign Center
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Build, save, and manage targeted customer retention campaigns.
            </p>

          </div>


          <div className="flex gap-3">

            <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              {selectedAudience.length} customers targeted
            </div>

            <button
              onClick={startNewCampaign}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + New Campaign
            </button>

          </div>

        </div>


        {/* KPI */}

        <div className="grid gap-5 md:grid-cols-4">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Customers
            </p>

            <h3 className="mt-2 text-3xl font-bold text-blue-600">
              {customers.length}
            </h3>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Current Audience
            </p>

            <h3 className="mt-2 text-3xl font-bold text-purple-600">
              {selectedAudience.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              {getSegmentLabel(segment)}
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Saved Campaigns
            </p>

            <h3 className="mt-2 text-3xl font-bold text-green-600">
              {campaigns.length}
            </h3>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Campaign Status
            </p>

            <h3 className="mt-2 text-xl font-bold text-orange-600">
              Draft
            </h3>

          </div>

        </div>


        {/* Builder */}

        <div className="grid gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">

            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>

                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCampaignId
                    ? "Edit Campaign"
                    : "Campaign Builder"}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Choose your audience and prepare the campaign message.
                </p>

              </div>

              {editingCampaignId && (
                <button
                  onClick={startNewCampaign}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Start New
                </button>
              )}

            </div>


            <div className="space-y-5">

              {/* Campaign Name */}

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Campaign Name
                </label>

                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) =>
                    setCampaignName(
                      e.target.value
                    )
                  }
                  placeholder="Weekend Win-back"
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                />

              </div>


              {/* Audience */}

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Audience
                </label>

                <div className="grid gap-3 sm:grid-cols-2">

                  <button
                    onClick={() =>
                      changeSegment(
                        "at_risk"
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      segment ===
                      "at_risk"
                        ? "border-orange-300 bg-orange-50"
                        : "hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="font-semibold text-gray-900">
                        At Risk
                      </span>

                      <span className="text-orange-600">
                        {
                          audiences
                            .atRisk
                            .length
                        }
                      </span>

                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      30+ days inactive
                    </p>

                  </button>


                  <button
                    onClick={() =>
                      changeSegment("vip")
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      segment ===
                      "vip"
                        ? "border-purple-300 bg-purple-50"
                        : "hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="font-semibold text-gray-900">
                        VIP
                      </span>

                      <span className="text-purple-600">
                        {audiences.vip.length}
                      </span>

                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Highest-value customers
                    </p>

                  </button>


                  <button
                    onClick={() =>
                      changeSegment(
                        "returning"
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      segment ===
                      "returning"
                        ? "border-blue-300 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="font-semibold text-gray-900">
                        Returning
                      </span>

                      <span className="text-blue-600">
                        {
                          audiences
                            .returning
                            .length
                        }
                      </span>

                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Repeat customers
                    </p>

                  </button>


                  <button
                    onClick={() =>
                      changeSegment("new")
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      segment ===
                      "new"
                        ? "border-green-300 bg-green-50"
                        : "hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="font-semibold text-gray-900">
                        New
                      </span>

                      <span className="text-green-600">
                        {
                          audiences
                            .newCustomers
                            .length
                        }
                      </span>

                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      0–1 orders
                    </p>

                  </button>

                </div>

              </div>


              {/* Channel */}

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Channel
                </label>

                <div className="grid gap-3 md:grid-cols-3">

                  <button
                    onClick={() =>
                      setChannel(
                        "whatsapp"
                      )
                    }
                    className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                      channel ===
                      "whatsapp"
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    WhatsApp
                  </button>


                  <button
                    onClick={() =>
                      setChannel("sms")
                    }
                    className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                      channel === "sms"
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    SMS
                  </button>


                  <button
                    onClick={() =>
                      setChannel("email")
                    }
                    className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                      channel ===
                      "email"
                        ? "border-purple-300 bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Email
                  </button>

                </div>

              </div>


              {/* Subject */}

              {channel === "email" && (
                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email Subject
                  </label>

                  <input
                    type="text"
                    value={subject}
                    onChange={(e) =>
                      setSubject(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                  />

                </div>
              )}


              {/* Message */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="block text-sm font-medium text-gray-700">
                    Message
                  </label>

                  <span className="text-xs text-gray-400">
                    Use {"{{name}}"} for customer name
                  </span>

                </div>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  rows={7}
                  className="w-full resize-none rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              {/* Save */}

              <div className="flex flex-col gap-3 sm:flex-row">

                <button
                  onClick={saveCampaign}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingCampaignId
                    ? "Update Campaign"
                    : "Save Campaign"}
                </button>

                <button
                  onClick={() => {
                    setSubject(
                      templates[
                        segment
                      ].subject
                    );

                    setMessage(
                      templates[
                        segment
                      ].message
                    );

                    setSavedMessage("");
                  }}
                  className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset Template
                </button>

              </div>


              {savedMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {savedMessage}
                </div>
              )}

            </div>

          </div>


          {/* Preview */}

          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <div className="mb-6">

              <h3 className="text-lg font-semibold text-gray-900">
                Message Preview
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Preview using the first customer in the selected audience.
              </p>

            </div>


            <div className="rounded-2xl bg-gray-50 p-5">

              <div className="mb-4 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg">
                  💬
                </div>

                <div>

                  <p className="font-semibold text-gray-900">
                    {getChannelLabel(
                      channel
                    )}
                  </p>

                  <p className="text-xs text-gray-500">
                    {
                      selectedAudience.length
                    }{" "}
                    recipients
                  </p>

                </div>

              </div>


              {channel === "email" && (
                <div className="mb-3 rounded-lg border bg-white p-3">

                  <p className="text-xs text-gray-400">
                    Subject
                  </p>

                  <p className="mt-1 font-medium text-gray-900">
                    {subject}
                  </p>

                </div>
              )}


              <div className="rounded-2xl bg-white p-4 shadow-sm">

                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {previewMessage()}
                </p>

              </div>

            </div>


            <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">

              <p className="text-sm font-medium text-yellow-800">
                Sending is not connected yet
              </p>

              <p className="mt-1 text-xs leading-5 text-yellow-700">
                Campaigns are currently saved as drafts. Actual WhatsApp, SMS, and Email delivery will be connected through providers later.
              </p>

            </div>

          </div>

        </div>


        {/* Saved Campaigns */}

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>

                <h3 className="text-lg font-semibold text-gray-900">
                  Saved Campaigns
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Your saved campaign drafts.
                </p>

              </div>

              <div className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                {campaigns.length} campaigns
              </div>

            </div>

          </div>


          {campaigns.length === 0 ? (

            <div className="p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                📣
              </div>

              <h4 className="mt-4 font-semibold text-gray-900">
                No saved campaigns yet
              </h4>

              <p className="mt-1 text-sm text-gray-500">
                Build your first retention campaign above.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {campaigns.map(
                (campaign) => (

                  <div
                    key={campaign.id}
                    className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between"
                  >

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h4 className="font-semibold text-gray-900">
                          {campaign.name}
                        </h4>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          Draft
                        </span>

                      </div>


                      <div className="mt-2 flex flex-wrap gap-2">

                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                          {getSegmentLabel(
                            campaign.segment
                          )}
                        </span>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          {getChannelLabel(
                            campaign.channel
                          )}
                        </span>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          {
                            campaign.audience_count
                          }{" "}
                          recipients
                        </span>

                      </div>


                      <p className="mt-3 line-clamp-2 max-w-3xl text-sm text-gray-500">
                        {campaign.message}
                      </p>


                      <p className="mt-2 text-xs text-gray-400">
                        Updated{" "}
                        {new Date(
                          campaign.updated_at
                        ).toLocaleString()}
                      </p>

                    </div>


                    <div className="flex shrink-0 gap-2">

                      <button
                        onClick={() =>
                          openCampaign(
                            campaign
                          )
                        }
                        className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteCampaign(
                            campaign.id
                          )
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>


        {/* Audience */}

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

              <div>

                <h3 className="text-lg font-semibold text-gray-900">
                  Selected Audience
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Customers currently matching the selected segment.
                </p>

              </div>

              <div className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                {
                  selectedAudience.length
                }{" "}
                recipients
              </div>

            </div>

          </div>


          {selectedAudience.length === 0 ? (

            <div className="p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-2xl">
                👥
              </div>

              <h4 className="mt-4 font-semibold text-gray-900">
                No customers in this segment
              </h4>

              <p className="mt-1 text-sm text-gray-500">
                Try another audience segment.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="border-b bg-gray-50 text-sm text-gray-500">

                  <tr>

                    <th className="px-6 py-4">
                      Customer
                    </th>

                    <th className="px-6 py-4">
                      Contact
                    </th>

                    <th className="px-6 py-4">
                      Orders
                    </th>

                    <th className="px-6 py-4">
                      Lifetime Value
                    </th>

                    <th className="px-6 py-4">
                      Last Order
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {selectedAudience.map(
                    (customer) => (

                      <tr
                        key={
                          customer.id
                        }
                        className="border-b last:border-0 hover:bg-gray-50"
                      >

                        <td className="px-6 py-4">

                          <a
                            href={`/customers/${customer.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {customer.name}
                          </a>

                        </td>


                        <td className="px-6 py-4 text-sm text-gray-600">

                          {channel ===
                            "whatsapp" ||
                          channel === "sms"
                            ? customer.phone ||
                              "No phone"
                            : customer.email ||
                              "No email"}

                        </td>


                        <td className="px-6 py-4 font-medium text-gray-900">

                          {Number(
                            customer.total_orders ||
                              0
                          )}

                        </td>


                        <td className="px-6 py-4 font-medium text-gray-900">

                          $
                          {Number(
                            customer.total_spent ||
                              0
                          ).toFixed(2)}

                        </td>


                        <td className="px-6 py-4 text-gray-600">

                          {customer.last_order_at
                            ? new Date(
                                customer.last_order_at
                              ).toLocaleDateString()
                            : "Never"}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* Playbook */}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h3 className="text-lg font-semibold text-gray-900">
              Recommended Retention Playbook
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              A simple campaign strategy based on customer lifecycle stage.
            </p>

          </div>


          <div className="grid gap-4 md:grid-cols-4">

            <div className="rounded-xl bg-orange-50 p-5">

              <p className="font-semibold text-orange-800">
                At Risk
              </p>

              <p className="mt-2 text-sm leading-6 text-orange-700">
                Bring inactive customers back with a time-limited offer.
              </p>

            </div>


            <div className="rounded-xl bg-purple-50 p-5">

              <p className="font-semibold text-purple-800">
                VIP
              </p>

              <p className="mt-2 text-sm leading-6 text-purple-700">
                Focus on loyalty, exclusivity, and early access.
              </p>

            </div>


            <div className="rounded-xl bg-blue-50 p-5">

              <p className="font-semibold text-blue-800">
                Returning
              </p>

              <p className="mt-2 text-sm leading-6 text-blue-700">
                Encourage frequent visits and build repeat behavior.
              </p>

            </div>


            <div className="rounded-xl bg-green-50 p-5">

              <p className="font-semibold text-green-800">
                New
              </p>

              <p className="mt-2 text-sm leading-6 text-green-700">
                Push the second order and establish the habit of returning.
              </p>

            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}