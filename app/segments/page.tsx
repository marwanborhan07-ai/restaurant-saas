"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_orders: number | null;
  last_order_at: string | null;
};

type Order = {
  id: string;
  customer_id: string | null;
  total: number;
  currency_code: string | null;
  status: string;
  created_at: string;
};

type SegmentCustomer = Customer & {
  ordersCount: number;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  revenueByCurrency: Record<string, number>;
  maxSingleCurrencySpend: number;
  topCurrency: string | null;
  whatsappReady: boolean;
};

type SegmentKey =
  | "vip"
  | "repeat"
  | "new"
  | "at_risk"
  | "lost"
  | "high_spender"
  | "whatsapp";

function daysSince(date: string | null) {
  if (!date) return null;

  const now = new Date();
  const target = new Date(date);

  return Math.max(
    0,
    Math.floor(
      (now.getTime() - target.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function getTopCurrency(
  revenueByCurrency: Record<string, number>
) {
  const entries = Object.entries(revenueByCurrency);

  if (entries.length === 0) {
    return {
      currency: null,
      amount: 0,
    };
  }

  entries.sort((a, b) => b[1] - a[1]);

  return {
    currency: entries[0][0],
    amount: entries[0][1],
  };
}

export default function SegmentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSegment, setActiveSegment] =
    useState<SegmentKey>("vip");

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

      const [
        { data: customersData, error: customersError },
        { data: ordersData, error: ordersError },
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id,name,email,phone,total_orders,last_order_at"
          )
          .eq("restaurant_id", restaurant.id),

        supabase
          .from("orders")
          .select(
            "id,customer_id,total,currency_code,status,created_at"
          )
          .eq("restaurant_id", restaurant.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (customersError) {
        throw new Error(customersError.message);
      }

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      setCustomers(customersData || []);
      setOrders(ordersData || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading segments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const customerProfiles = useMemo(() => {
    return customers.map((customer) => {
      const customerOrders = orders.filter(
        (order) =>
          order.customer_id === customer.id
      );

      const revenueByCurrency: Record<
        string,
        number
      > = {};

      let lastOrderAt: string | null = null;

      for (const order of customerOrders) {
        const currency =
          order.currency_code || "EGP";

        revenueByCurrency[currency] =
          (revenueByCurrency[currency] || 0) +
          Number(order.total || 0);

        if (
          !lastOrderAt ||
          new Date(order.created_at).getTime() >
            new Date(lastOrderAt).getTime()
        ) {
          lastOrderAt = order.created_at;
        }
      }

      const top = getTopCurrency(
        revenueByCurrency
      );

      return {
        ...customer,
        ordersCount: customerOrders.length,
        lastOrderAt,
        daysSinceLastOrder:
          daysSince(lastOrderAt),
        revenueByCurrency,
        maxSingleCurrencySpend: top.amount,
        topCurrency: top.currency,
        whatsappReady:
          Boolean(customer.phone?.trim()),
      } satisfies SegmentCustomer;
    });
  }, [customers, orders]);

  const segments = useMemo(() => {
    const vip = customerProfiles.filter(
      (customer) =>
        customer.ordersCount >= 5 ||
        customer.maxSingleCurrencySpend >= 500
    );

    const repeat = customerProfiles.filter(
      (customer) =>
        customer.ordersCount >= 2 &&
        customer.ordersCount < 5 &&
        customer.maxSingleCurrencySpend < 500
    );

    const newCustomers = customerProfiles.filter(
      (customer) =>
        customer.ordersCount === 0 ||
        customer.ordersCount === 1
    );

    const atRisk = customerProfiles.filter(
      (customer) =>
        customer.ordersCount > 0 &&
        customer.daysSinceLastOrder !== null &&
        customer.daysSinceLastOrder >= 30 &&
        customer.daysSinceLastOrder < 60
    );

    const lost = customerProfiles.filter(
      (customer) =>
        customer.ordersCount > 0 &&
        customer.daysSinceLastOrder !== null &&
        customer.daysSinceLastOrder >= 60
    );

    const highSpenders = customerProfiles.filter(
      (customer) =>
        customer.maxSingleCurrencySpend >= 1000
    );

    const whatsapp = customerProfiles.filter(
      (customer) =>
        customer.whatsappReady
    );

    return {
      vip,
      repeat,
      newCustomers,
      atRisk,
      lost,
      highSpenders,
      whatsapp,
    };
  }, [customerProfiles]);

  const segmentConfig: Record<
    SegmentKey,
    {
      title: string;
      description: string;
      icon: string;
      color: string;
      customers: SegmentCustomer[];
    }
  > = {
    vip: {
      title: "VIP Customers",
      description:
        "Customers with strong frequency or high value in a single currency.",
      icon: "👑",
      color: "purple",
      customers: segments.vip,
    },

    repeat: {
      title: "Repeat Buyers",
      description:
        "Customers who already ordered more than once.",
      icon: "🔁",
      color: "blue",
      customers: segments.repeat,
    },

    new: {
      title: "New Customers",
      description:
        "Customers with zero or one recorded order.",
      icon: "🆕",
      color: "green",
      customers: segments.newCustomers,
    },

    at_risk: {
      title: "At Risk",
      description:
        "Customers inactive for 30 to 59 days.",
      icon: "⚠️",
      color: "orange",
      customers: segments.atRisk,
    },

    lost: {
      title: "Lost Customers",
      description:
        "Customers inactive for 60 days or more.",
      icon: "💤",
      color: "red",
      customers: segments.lost,
    },

    high_spender: {
      title: "High Spenders",
      description:
        "Customers spending at least 1,000 in one currency.",
      icon: "💰",
      color: "emerald",
      customers: segments.highSpenders,
    },

    whatsapp: {
      title: "WhatsApp Ready",
      description:
        "Customers with a phone number available for outreach.",
      icon: "📱",
      color: "cyan",
      customers: segments.whatsapp,
    },
  };

  const active = segmentConfig[activeSegment];

  return (
    <AppShell title="Smart Segments">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Customer Intelligence
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Smart Segments
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Automatically organize customers by behavior,
              value, recency, and contactability.
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="rounded-2xl border bg-white p-8 text-gray-500 shadow-sm">
            Loading smart segments...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(segmentConfig) as SegmentKey[]).map(
                (key) => {
                  const item = segmentConfig[key];
                  const selected =
                    activeSegment === key;

                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setActiveSegment(key)
                      }
                      className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        selected
                          ? "border-blue-300 ring-2 ring-blue-100"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-2xl">
                          {item.icon}
                        </span>

                        <span className="text-3xl font-bold text-gray-900">
                          {item.customers.length}
                        </span>
                      </div>

                      <h3 className="mt-4 font-semibold text-gray-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {item.description}
                      </p>
                    </button>
                  );
                }
              )}
            </div>

            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {active.icon}
                      </span>

                      <h3 className="text-xl font-semibold text-gray-900">
                        {active.title}
                      </h3>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {active.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">

                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                      <p className="text-xs text-gray-500">
                        Audience
                      </p>

                      <p className="text-2xl font-bold text-gray-900">
                        {active.customers.length}
                      </p>
                    </div>

                    {(activeSegment === "vip" ||
                      activeSegment === "repeat" ||
                      activeSegment === "new" ||
                      activeSegment === "at_risk") && (
                      <Link
                        href={`/campaigns?segment=${
                          activeSegment === "repeat"
                            ? "returning"
                            : activeSegment
                        }`}
                        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        Create Campaign →
                      </Link>
                    )}

                  </div>
                </div>
              </div>

              {active.customers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl">
                    🎯
                  </div>

                  <h4 className="mt-4 font-semibold text-gray-900">
                    No customers in this segment
                  </h4>

                  <p className="mt-1 text-sm text-gray-500">
                    This audience will update automatically as
                    customer behavior changes.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-6 py-4">
                          Customer
                        </th>

                        <th className="px-6 py-4">
                          Orders
                        </th>

                        <th className="px-6 py-4">
                          Revenue
                        </th>

                        <th className="px-6 py-4">
                          Last Order
                        </th>

                        <th className="px-6 py-4">
                          Contact
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {active.customers
                        .sort(
                          (a, b) =>
                            b.maxSingleCurrencySpend -
                            a.maxSingleCurrencySpend
                        )
                        .map((customer) => (
                          <tr
                            key={customer.id}
                            className="border-b last:border-0 hover:bg-gray-50"
                          >
                            <td className="px-6 py-5">
                              <Link
                                href={`/customers/${customer.id}`}
                                className="font-semibold text-gray-900 hover:text-blue-600"
                              >
                                {customer.name}
                              </Link>

                              <p className="mt-1 text-xs text-gray-400">
                                {customer.email ||
                                  "No email"}
                              </p>
                            </td>

                            <td className="px-6 py-5 font-medium text-gray-900">
                              {customer.ordersCount}
                            </td>

                            <td className="px-6 py-5">
                              {Object.keys(
                                customer.revenueByCurrency
                              ).length === 0 ? (
                                <span className="text-gray-400">
                                  No revenue
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {Object.entries(
                                    customer.revenueByCurrency
                                  ).map(
                                    ([currency, amount]) => (
                                      <div
                                        key={currency}
                                        className="font-semibold text-emerald-600"
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
                            </td>

                            <td className="px-6 py-5 text-sm text-gray-600">
                              {customer.lastOrderAt
                                ? new Date(
                                    customer.lastOrderAt
                                  ).toLocaleDateString()
                                : "No orders"}
                            </td>

                            <td className="px-6 py-5">
                              {customer.whatsappReady ? (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                  WhatsApp Ready
                                </span>
                              ) : (
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                                  No Phone
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Total Customers
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {customerProfiles.length}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Customer records in this restaurant
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Revenue Currencies
                </p>

                <div className="mt-3 space-y-1">
                  {Array.from(
                    new Set(
                      orders.map(
                        (order) =>
                          order.currency_code ||
                          "EGP"
                      )
                    )
                  ).map((currency) => (
                    <span
                      key={currency}
                      className="mr-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      {currency}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Actionable Segments
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-600">
                  7
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Behavior-based audiences ready for campaigns
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}