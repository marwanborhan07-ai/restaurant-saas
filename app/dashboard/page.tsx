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
        whatsappReady: Boolean(
          customer.phone?.trim()
        ),
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
      customers: SegmentCustomer[];
    }
  > = {
    vip: {
      title: "VIP Customers",
      description:
        "Customers with strong frequency or high value.",
      icon: "👑",
      customers: segments.vip,
    },

    repeat: {
      title: "Repeat Buyers",
      description:
        "Customers who already ordered more than once.",
      icon: "🔁",
      customers: segments.repeat,
    },

    new: {
      title: "New Customers",
      description:
        "Customers with zero or one recorded order.",
      icon: "🆕",
      customers: segments.newCustomers,
    },

    at_risk: {
      title: "At Risk",
      description:
        "Customers inactive for 30 to 59 days.",
      icon: "⚠️",
      customers: segments.atRisk,
    },

    lost: {
      title: "Lost Customers",
      description:
        "Customers inactive for 60 days or more.",
      icon: "💤",
      customers: segments.lost,
    },

    high_spender: {
      title: "High Spenders",
      description:
        "Customers spending at least 1,000 in one currency.",
      icon: "💰",
      customers: segments.highSpenders,
    },

    whatsapp: {
      title: "WhatsApp Ready",
      description:
        "Customers with a phone number available for outreach.",
      icon: "📱",
      customers: segments.whatsapp,
    },
  };

  const active = segmentConfig[activeSegment];

  const sortedCustomers = [...active.customers].sort(
    (a, b) =>
      b.maxSingleCurrencySpend -
      a.maxSingleCurrencySpend
  );

  return (
    <AppShell title="Smart Segments">
      <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 sm:text-sm">
              Customer Intelligence
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Smart Segments
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Automatically organize customers by
              behavior, value, recency, and
              contactability.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:p-8">
            Loading smart segments...
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 sm:p-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <>

            {/* SEGMENT CARDS */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {(Object.keys(
                segmentConfig
              ) as SegmentKey[]).map((key) => {
                const item = segmentConfig[key];

                const selected =
                  activeSegment === key;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      setActiveSegment(key)
                    }
                    className={`min-w-0 rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
                      selected
                        ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-900/40"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-2xl sm:text-3xl">
                        {item.icon}
                      </span>

                      <span className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        {item.customers.length}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white sm:mt-4 sm:text-base">
                      {item.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* ACTIVE SEGMENT */}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              {/* ACTIVE HEADER */}

              <div className="border-b border-gray-200 p-4 dark:border-slate-800 sm:p-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="min-w-0">

                    <div className="flex items-center gap-3">

                      <span className="text-2xl sm:text-3xl">
                        {active.icon}
                      </span>

                      <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                        {active.title}
                      </h3>

                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {active.description}
                    </p>

                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-slate-800 sm:block sm:min-w-[110px] sm:text-center">

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Audience
                      </p>

                      <p className="text-xl font-bold text-gray-900 dark:text-white sm:mt-1 sm:text-2xl">
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
                        className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        Create Campaign →
                      </Link>

                    )}

                  </div>

                </div>

              </div>

              {/* EMPTY STATE */}

              {active.customers.length === 0 ? (

                <div className="p-8 text-center sm:p-12">

                  <div className="text-4xl">
                    🎯
                  </div>

                  <h4 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                    No customers in this segment
                  </h4>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
                    This audience will update
                    automatically as customer
                    behavior changes.
                  </p>

                </div>

              ) : (

                <>

                  {/* MOBILE CUSTOMER CARDS */}

                  <div className="divide-y divide-gray-200 dark:divide-slate-800 md:hidden">

                    {sortedCustomers.map(
                      (customer) => (

                        <div
                          key={customer.id}
                          className="p-4"
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0 flex-1">

                              <Link
                                href={`/customers/${customer.id}`}
                                className="block truncate text-base font-semibold text-gray-900 hover:text-blue-600 dark:text-white"
                              >
                                {customer.name}
                              </Link>

                              <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                                {customer.email ||
                                  "No email"}
                              </p>

                            </div>

                            {customer.whatsappReady ? (

                              <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                                WhatsApp
                              </span>

                            ) : (

                              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                                No Phone
                              </span>

                            )}

                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">

                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800">

                              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Orders
                              </p>

                              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                                {customer.ordersCount}
                              </p>

                            </div>

                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800">

                              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Last Order
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {customer.lastOrderAt
                                  ? new Date(
                                      customer.lastOrderAt
                                    ).toLocaleDateString()
                                  : "No orders"}
                              </p>

                            </div>

                          </div>

                          <div className="mt-3 rounded-xl border border-gray-100 p-3 dark:border-slate-800">

                            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Revenue
                            </p>

                            {Object.keys(
                              customer.revenueByCurrency
                            ).length === 0 ? (

                              <p className="mt-1 text-sm text-gray-400">
                                No revenue
                              </p>

                            ) : (

                              <div className="mt-2 flex flex-wrap gap-2">

                                {Object.entries(
                                  customer.revenueByCurrency
                                ).map(
                                  ([currency, amount]) => (

                                    <span
                                      key={currency}
                                      className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                    >
                                      {formatMoney(
                                        amount,
                                        currency
                                      )}
                                    </span>

                                  )
                                )}

                              </div>

                            )}

                          </div>

                        </div>

                      )
                    )}

                  </div>

                  {/* DESKTOP TABLE */}

                  <div className="hidden overflow-x-auto md:block">

                    <table className="w-full min-w-[760px] text-left">

                      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-gray-400">

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

                        {sortedCustomers.map(
                          (customer) => (

                            <tr
                              key={customer.id}
                              className="border-b border-gray-100 transition hover:bg-gray-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50"
                            >

                              <td className="px-6 py-5">

                                <Link
                                  href={`/customers/${customer.id}`}
                                  className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white"
                                >
                                  {customer.name}
                                </Link>

                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                  {customer.email ||
                                    "No email"}
                                </p>

                              </td>

                              <td className="px-6 py-5 font-semibold text-gray-900 dark:text-white">
                                {customer.ordersCount}
                              </td>

                              <td className="px-6 py-5">

                                {Object.keys(
                                  customer.revenueByCurrency
                                ).length === 0 ? (

                                  <span className="text-sm text-gray-400">
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
                                          className="font-semibold text-emerald-600 dark:text-emerald-400"
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

                              <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-300">

                                {customer.lastOrderAt
                                  ? new Date(
                                      customer.lastOrderAt
                                    ).toLocaleDateString()
                                  : "No orders"}

                              </td>

                              <td className="px-6 py-5">

                                {customer.whatsappReady ? (

                                  <span className="whitespace-nowrap rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                                    WhatsApp Ready
                                  </span>

                                ) : (

                                  <span className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                                    No Phone
                                  </span>

                                )}

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </>

              )}

            </div>

            {/* SUMMARY */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Customers
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {customerProfiles.length}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-gray-500">
                  Customer records in this restaurant
                </p>

              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Revenue Currencies
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  {Array.from(
                    new Set(
                      orders.map(
                        (order) =>
                          order.currency_code ||
                          "EGP"
                      )
                    )
                  ).length === 0 ? (

                    <span className="text-sm text-gray-400">
                      No orders yet
                    </span>

                  ) : (

                    Array.from(
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
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                      >
                        {currency}
                      </span>

                    ))

                  )}

                </div>

              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Actionable Segments
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                  7
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-gray-500">
                  Behavior-based audiences ready for
                  campaigns
                </p>

              </div>

            </div>

          </>
        )}

      </div>
    </AppShell>
  );
}