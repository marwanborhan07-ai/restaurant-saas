"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Campaign = {
  id: string;
  name: string;
  segment: string;
  channel: string;
  status: string;
  audience_count: number;
  sent_at: string | null;
  created_at: string;
  cost_amount: number;
  cost_currency_code: string;
};

type Recipient = {
  id: string;
  campaign_id: string;
  customer_id: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
};

type Order = {
  id: string;
  customer_id: string | null;
  total: number;
  currency_code: string | null;
  status: string;
  created_at: string;
  cost_amount: number;
  cost_currency_code: string;
};

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function buildLastTouchAttribution(
  campaigns: Campaign[],
  recipients: Recipient[],
  orders: Order[]
) {
  const result = new Map<string, Order[]>();

  const sentCampaignIds = new Set(
    campaigns
      .filter(
        (campaign) =>
          campaign.status === "sent"
      )
      .map((campaign) => campaign.id)
  );

  const eligibleRecipients = recipients
    .filter(
      (recipient) =>
        sentCampaignIds.has(
          recipient.campaign_id
        ) &&
        Boolean(recipient.sent_at)
    )
    .map((recipient) => ({
      ...recipient,
      sentTimestamp: new Date(
        recipient.sent_at as string
      ).getTime(),
    }));

  for (const order of orders) {
    if (!order.customer_id) {
      continue;
    }

    const orderTimestamp =
      new Date(order.created_at).getTime();

    const candidates =
      eligibleRecipients
        .filter(
          (recipient) =>
            recipient.customer_id ===
              order.customer_id &&
            recipient.sentTimestamp <
              orderTimestamp &&
            orderTimestamp <=
              recipient.sentTimestamp +
                7 * 24 * 60 * 60 * 1000
        )
        .sort(
          (a, b) =>
            b.sentTimestamp -
            a.sentTimestamp
        );

    const bestMatch =
      candidates[0];

    if (!bestMatch) {
      continue;
    }

    const existing =
      result.get(
        bestMatch.campaign_id
      ) || [];

    if (
      !existing.some(
        (existingOrder) =>
          existingOrder.id === order.id
      )
    ) {
      existing.push(order);
    }

    result.set(
      bestMatch.campaign_id,
      existing
    );
  }

  return result;
}
function getCampaignMetrics(
  campaign: Campaign,
  recipients: Recipient[],
  orders: Order[],
  attributionByCampaign: Map<string, Order[]>
) {
  const campaignRecipients = recipients.filter(
    (recipient) =>
      recipient.campaign_id === campaign.id
  );

  const sentRecipients = campaignRecipients.filter(
    (recipient) =>
      recipient.status === "sent" ||
      recipient.status === "delivered" ||
      recipient.status === "read" ||
      Boolean(recipient.sent_at)
  );

  const deliveredRecipients = campaignRecipients.filter(
    (recipient) =>
      recipient.status === "delivered" ||
      recipient.status === "read" ||
      Boolean(recipient.delivered_at)
  );

  const readRecipients = campaignRecipients.filter(
    (recipient) =>
      recipient.status === "read" ||
      Boolean(recipient.read_at)
  );

  const failedRecipients = campaignRecipients.filter(
    (recipient) =>
      recipient.status === "failed"
  );

  const attributedOrders =
    attributionByCampaign.get(
      campaign.id
    ) || [];

  const revenueByCurrency: Record<
    string,
    number
  > = {};

  for (const order of attributedOrders.values()) {
    const currency =
      order.currency_code || "EGP";

    revenueByCurrency[currency] =
      (revenueByCurrency[currency] || 0) +
      Number(order.total || 0);
  }

  const recipientsCount =
    campaignRecipients.length ||
    campaign.audience_count ||
    0;

  const sentCount =
    sentRecipients.length;

  const deliveredCount =
    deliveredRecipients.length;

  const readCount =
    readRecipients.length;

  const failedCount =
    failedRecipients.length;

  const attributedOrderCount =
    attributedOrders.length;

  const convertedCustomerIds =
    new Set(
      attributedOrders
        .map(
          (order) => order.customer_id
        )
        .filter(
          (customerId): customerId is string =>
            Boolean(customerId)
        )
    );

  const convertedCustomerCount =
    convertedCustomerIds.size;

  const uniqueRecipientCustomerIds =
    new Set(
      sentRecipients
        .map(
          (recipient) =>
            recipient.customer_id
        )
        .filter(
          (customerId): customerId is string =>
            Boolean(customerId)
        )
    );

  const uniqueRecipientCustomers =
    uniqueRecipientCustomerIds.size;

  const conversionRate =
    uniqueRecipientCustomers > 0
      ? (convertedCustomerCount /
          uniqueRecipientCustomers) *
        100
      : 0;

  return {
    recipientsCount,
    sentCount,
    deliveredCount,
    readCount,
    failedCount,
    convertedCount: convertedCustomerCount,
    convertedCustomerCount,
    attributedOrderCount,
    conversionRate,
    revenueByCurrency:
      Object.entries(revenueByCurrency).sort(
        (a, b) => b[1] - a[1]
      ),
  };
}

export function CampaignROI() {
  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);

  const [recipients, setRecipients] =
    useState<Recipient[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] =
    useState("");

  const [costAmount, setCostAmount] =
    useState("");

  const [costCurrency, setCostCurrency] =
    useState("EGP");

  const [savingCost, setSavingCost] =
    useState(false);

  const [costMessage, setCostMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

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

      if (
        restaurantError ||
        !restaurant
      ) {
        throw new Error(
          restaurantError?.message ||
            "Restaurant not found."
        );
      }

      const [
        campaignsResult,
        recipientsResult,
        ordersResult,
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
            sent_at,
            created_at,
            cost_amount,
            cost_currency_code
          `)
          .eq(
            "restaurant_id",
            restaurant.id
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("campaign_recipients")
          .select(`
            id,
            campaign_id,
            customer_id,
            status,
            sent_at,
            delivered_at,
            read_at
          `),

        supabase
          .from("orders")
          .select(`
            id,
            customer_id,
            total,
            currency_code,
            status,
            created_at
          `)
          .eq(
            "restaurant_id",
            restaurant.id
          )
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (campaignsResult.error) {
        throw new Error(
          campaignsResult.error.message
        );
      }

      if (recipientsResult.error) {
        throw new Error(
          recipientsResult.error.message
        );
      }

      if (ordersResult.error) {
        throw new Error(
          ordersResult.error.message
        );
      }

      const campaignList =
        (campaignsResult.data || []) as Campaign[];

      setCampaigns(campaignList);

      setRecipients(
        (recipientsResult.data ||
          []) as Recipient[]
      );

      setOrders(
        (ordersResult.data ||
          []) as Order[]
      );

      if (
        !selectedCampaignId &&
        campaignList.length > 0
      ) {
        setSelectedCampaignId(
          campaignList[0].id
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load campaign ROI."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const timer =
      window.setInterval(
        loadData,
        30000
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  const selectedCampaign =
    campaigns.find(
      (campaign) =>
        campaign.id ===
        selectedCampaignId
    ) || null;
  async function saveCampaignCost() {
    if (!selectedCampaign) {
      return;
    }

    const parsedCost = Number(costAmount);

    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setCostMessage("Enter a valid non-negative cost.");
      return;
    }

    try {
      setSavingCost(true);
      setCostMessage("");

      const supabase = createClient();

      const { error } = await supabase
        .from("campaigns")
        .update({
          cost_amount: parsedCost,
          cost_currency_code: costCurrency,
        })
        .eq("id", selectedCampaign.id);

      if (error) {
        throw error;
      }

      setCampaigns((current) =>
        current.map((campaign) =>
          campaign.id === selectedCampaign.id
            ? {
                ...campaign,
                cost_amount: parsedCost,
                cost_currency_code: costCurrency,
              }
            : campaign
        )
      );

      setCostMessage("Campaign cost saved.");
    } catch (err) {
      setCostMessage(
        err instanceof Error
          ? err.message
          : "Could not save campaign cost."
      );
    } finally {
      setSavingCost(false);
    }
  }
  const attributionByCampaign = useMemo(() => {
    return buildLastTouchAttribution(
      campaigns,
      recipients,
      orders
    );
  }, [
    campaigns,
    recipients,
    orders,
  ]);

  const metrics = useMemo(() => {
    if (!selectedCampaign) {
      return null;
    }

    return getCampaignMetrics(
      selectedCampaign,
      recipients,
      orders,
      attributionByCampaign
    );
  }, [
    selectedCampaign,
    recipients,
    orders,
  ]);

  const realRoi = useMemo(() => {
    if (!selectedCampaign || !metrics) {
      return {
        spend: 0,
        currency: "EGP",
        revenue: 0,
        roas: null as number | null,
        roi: null as number | null,
      };
    }

    const spend = Number(
      selectedCampaign.cost_amount || 0
    );

    const currency =
      selectedCampaign.cost_currency_code || "EGP";

    const revenue =
      metrics.revenueByCurrency.find(
        ([code]) => code === currency
      )?.[1] || 0;

    if (spend <= 0) {
      return {
        spend,
        currency,
        revenue,
        roas: null,
        roi: null,
      };
    }

    const roas = revenue / spend;

    const roi =
      ((revenue - spend) / spend) * 100;

    return {
      spend,
      currency,
      revenue,
      roas,
      roi,
    };
  }, [selectedCampaign, metrics]);
  const overview = useMemo(() => {
    const totals = {
      campaigns: campaigns.filter(
        (campaign) =>
          campaign.status === "sent"
      ).length,

      recipients: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      convertedCustomers: 0,
      attributedOrders: 0,

      revenueByCurrency:
        {} as Record<string, number>,
    };

    const uniqueSentCustomerIds =
      new Set<string>();

    for (const campaign of campaigns) {
      if (
        campaign.status !== "sent"
      ) {
        continue;
      }

      const current =
        getCampaignMetrics(
          campaign,
          recipients,
          orders,
          attributionByCampaign
        );

      totals.recipients +=
        current.recipientsCount;

      totals.sent +=
        current.sentCount;

      totals.delivered +=
        current.deliveredCount;

      recipients
        .filter(
          (recipient) =>
            recipient.campaign_id ===
              campaign.id &&
            Boolean(recipient.sent_at)
        )
        .forEach(
          (recipient) => {
            uniqueSentCustomerIds.add(
              recipient.customer_id
            );
          }
        );

      totals.read +=
        current.readCount;

      totals.convertedCustomers +=
        current.convertedCustomerCount;

      totals.attributedOrders +=
        current.attributedOrderCount;

      for (const [
        currency,
        amount,
      ] of current.revenueByCurrency) {
        totals.revenueByCurrency[
          currency
        ] =
          (totals.revenueByCurrency[
            currency
          ] || 0) + amount;
      }
    }

    const uniqueSentCustomers =
      uniqueSentCustomerIds.size;

    const conversionRate =
      uniqueSentCustomers > 0
        ? (totals.convertedCustomers /
            uniqueSentCustomers) *
          100
        : 0;

    return {
      ...totals,
      uniqueSentCustomers,
      conversionRate,
      revenueByCurrency:
        Object.entries(
          totals.revenueByCurrency
        ).sort(
          (a, b) => b[1] - a[1]
        ),
    };
  }, [
    campaigns,
    recipients,
    orders,
  ]);

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div>
          <p className="text-sm font-medium text-blue-600">
            Growth Analytics
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Campaign ROI
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Measure delivery, engagement, conversions,
            and attributed revenue after each campaign.
          </p>
        </div>

        <button
          onClick={loadData}
          className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl bg-gray-50 p-6 text-sm text-gray-500">
          Loading campaign performance...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-4">

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs text-blue-700">
                Sent Campaigns
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-900">
                {overview.campaigns}
              </p>
            </div>
            <div className="rounded-xl bg-cyan-50 p-4">
              <p className="text-xs text-cyan-700">
                Unique Customers Reached
              </p>

              <p className="mt-2 text-2xl font-bold text-cyan-900">
                {overview.uniqueSentCustomers}
              </p>

              <p className="mt-1 text-xs text-cyan-700">
                unique customers
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs text-green-700">
                Converted Customers
              </p>

              <p className="mt-2 text-2xl font-bold text-green-900">
                {overview.convertedCustomers}
              </p>

              <p className="mt-1 text-xs text-green-700">
                {overview.conversionRate.toFixed(1)}%
                conversion
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-xs text-purple-700">
                Delivered
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-900">
                {overview.delivered}
              </p>

              <p className="mt-1 text-xs text-purple-700">
                of {overview.sent} sent
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-600">
                Attributed Orders
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {overview.attributedOrders}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                orders linked to campaigns
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">
                Attributed Revenue
              </p>

              <div className="mt-2 space-y-1">
                {overview.revenueByCurrency.length === 0 ? (
                  <span className="text-sm font-medium text-gray-400">
                    No attributed revenue yet
                  </span>
                ) : (
                  overview.revenueByCurrency.map(
                    ([currency, amount]) => (
                      <div
                        key={currency}
                        className="font-bold text-emerald-900"
                      >
                        {formatMoney(
                          amount,
                          currency
                        )}
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </div>

          {campaigns.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700">
                Campaign
              </label>

              <select
                value={selectedCampaignId}
                onChange={(e) =>
                  setSelectedCampaignId(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {campaigns.map(
                  (campaign) => (
                    <option
                      key={campaign.id}
                      value={campaign.id}
                    >
                      {campaign.name} ·{" "}
                      {campaign.status}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {selectedCampaign &&
            metrics && (
              <div className="mt-6 rounded-2xl border bg-gray-50 p-5">

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedCampaign.name}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Attribution window: 7 days
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {selectedCampaign.channel}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-gray-500">
                      Recipients
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {metrics.recipientsCount}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-gray-500">
                      Sent
                    </p>
                    <p className="mt-2 text-xl font-bold text-blue-600">
                      {metrics.sentCount}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-gray-500">
                      Read
                    </p>
                    <p className="mt-2 text-xl font-bold text-purple-600">
                      {metrics.readCount}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-gray-500">
                      Converted Customers
                    </p>

                    <p className="mt-2 text-xl font-bold text-green-600">
                      {metrics.convertedCustomerCount}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {metrics.conversionRate.toFixed(
                        1
                      )}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-gray-500">
                      Attributed Orders
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-700">
                      {metrics.attributedOrderCount}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-gray-500">
                      Failed
                    </p>
                    <p className="mt-2 text-xl font-bold text-red-600">
                      {metrics.failedCount}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-white p-5">
                  <p className="text-sm font-medium text-gray-700">
                    Attributed Revenue
                  </p>

                  {metrics.revenueByCurrency.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-400">
                      No orders attributed to this campaign yet.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {metrics.revenueByCurrency.map(
                        ([currency, amount]) => (
                          <div
                            key={currency}
                            className="rounded-lg bg-emerald-50 px-4 py-3 font-bold text-emerald-800"
                          >
                            {formatMoney(
                              amount,
                              currency
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-xs leading-5 text-gray-400">
                    Revenue is attributed only when the same customer
                    places an order after the campaign was sent and
                    within the 7-day attribution window.
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        Campaign Cost
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Add the actual spend for this campaign to calculate
                        ROAS and real ROI.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                      <div>
                        <label className="text-xs font-medium text-gray-500">
                          Amount
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={costAmount}
                          onChange={(e) =>
                            setCostAmount(e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">
                          Currency
                        </label>

                        <select
                          value={costCurrency}
                          onChange={(e) =>
                            setCostCurrency(e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        >
                          {[
                            "EGP",
                            "USD",
                            "SAR",
                            "AED",
                            "QAR",
                            "KWD",
                            "BHD",
                            "OMR",
                            "EUR",
                            "GBP",
                            "CAD",
                            "AUD",
                            "INR",
                            "TRY",
                          ].map((currency) => (
                            <option
                              key={currency}
                              value={currency}
                            >
                              {currency}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={saveCampaignCost}
                        disabled={savingCost}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingCost
                          ? "Saving..."
                          : "Save Cost"}
                      </button>
                    </div>
                  </div>

                  {costMessage && (
                    <p className="mt-3 text-sm text-gray-600">
                      {costMessage}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Spend
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {formatMoney(
                        realRoi.spend,
                        realRoi.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs text-blue-600">
                      Attributed Revenue
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-900">
                      {formatMoney(
                        realRoi.revenue,
                        realRoi.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-purple-50 p-4">
                    <p className="text-xs text-purple-600">
                      ROAS
                    </p>

                    <p className="mt-2 text-xl font-bold text-purple-900">
                      {realRoi.roas === null
                        ? "—"
                        : `${realRoi.roas.toFixed(2)}x`}
                    </p>
                  </div>

                  <div
                    className={
                      realRoi.roi === null
                        ? "rounded-xl bg-yellow-50 p-4"
                        : realRoi.roi >= 0
                        ? "rounded-xl bg-green-50 p-4"
                        : "rounded-xl bg-red-50 p-4"
                    }
                  >
                    <p className="text-xs text-gray-600">
                      ROI
                    </p>

                    <p className="mt-2 text-xl font-bold text-gray-900">
                      {realRoi.roi === null
                        ? "—"
                        : `${realRoi.roi.toFixed(1)}%`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">
                    ROI Status
                  </p>

                  {realRoi.roi === null ? (
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Add campaign cost to activate real ROAS and ROI.
                    </p>
                  ) : realRoi.roi >= 0 ? (
                    <p className="mt-1 text-sm leading-6 text-green-700">
                      Positive ROI. This campaign generated more attributed
                      revenue than its recorded spend.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm leading-6 text-red-700">
                      Negative ROI. Recorded campaign spend is higher than
                      attributed revenue in the selected currency.
                    </p>
                  )}
                </div>

              </div>
            )}
        </>
      )}
    </section>
  );
}