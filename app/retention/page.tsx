"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_orders: number | null;
  total_spent: number | null;
  last_order_at: string | null;
};

type RetentionCustomer = Customer & {
  daysSinceLastOrder: number | null;
};

export default function RetentionPage() {
  const [customers, setCustomers] = useState<
    RetentionCustomer[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function loadRetentionData() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const restaurantId =
        await getRestaurantId(supabase);

      const {
        data,
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
        .order("total_spent", {
          ascending: false,
        });

      if (customersError) {
        throw new Error(
          customersError.message
        );
      }

      const now = new Date();

      const formattedCustomers: RetentionCustomer[] =
        (data || []).map((customer) => {
          let daysSinceLastOrder:
            | number
            | null = null;

          if (customer.last_order_at) {
            const lastOrderDate = new Date(
              customer.last_order_at
            );

            const difference =
              now.getTime() -
              lastOrderDate.getTime();

            daysSinceLastOrder = Math.max(
              0,
              Math.floor(
                difference /
                  (1000 * 60 * 60 * 24)
              )
            );
          }

          return {
            ...customer,
            daysSinceLastOrder,
          };
        });

      setCustomers(formattedCustomers);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading retention data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRetentionData();
  }, []);

  const segments = useMemo(() => {
    const vip = customers.filter(
      (customer) =>
        Number(customer.total_spent || 0) >= 500 ||
        Number(customer.total_orders || 0) >= 5
    );

    const newCustomers = customers.filter(
      (customer) =>
        Number(customer.total_orders || 0) <= 1
    );

    const returning = customers.filter(
      (customer) =>
        Number(customer.total_orders || 0) > 1 &&
        !(
          Number(customer.total_spent || 0) >= 500 ||
          Number(customer.total_orders || 0) >= 5
        )
    );

    const atRisk = customers.filter(
      (customer) =>
        Number(customer.total_orders || 0) > 0 &&
        customer.daysSinceLastOrder !== null &&
        customer.daysSinceLastOrder >= 30
    );

    return {
      vip,
      newCustomers,
      returning,
      atRisk,
    };
  }, [customers]);

  const opportunities = useMemo(() => {
    return [...segments.atRisk]
      .sort(
        (a, b) =>
          Number(b.total_spent || 0) -
          Number(a.total_spent || 0)
      )
      .slice(0, 5);
  }, [segments.atRisk]);

  function getSegment(customer: RetentionCustomer) {
    const totalOrders = Number(
      customer.total_orders || 0
    );

    const totalSpent = Number(
      customer.total_spent || 0
    );

    if (
      totalSpent >= 500 ||
      totalOrders >= 5
    ) {
      return {
        name: "VIP",
        className:
          "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
      };
    }

    if (totalOrders > 1) {
      return {
        name: "Returning",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
      };
    }

    return {
      name: "New",
      className:
        "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    };
  }

  function getRiskLevel(
    customer: RetentionCustomer
  ) {
    if (
      customer.daysSinceLastOrder !== null &&
      customer.daysSinceLastOrder >= 60
    ) {
      return {
        label: "High Risk",
        className:
          "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
      };
    }

    if (
      customer.daysSinceLastOrder !== null &&
      customer.daysSinceLastOrder >= 30
    ) {
      return {
        label: "At Risk",
        className:
          "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
      };
    }

    return {
      label: "Healthy",
      className:
        "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    };
  }

  if (loading) {
    return (
      <AppShell title="Retention">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:p-6">
          Loading retention data...
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Retention">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 sm:p-6">
          <strong>Error:</strong> {error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Retention">
      <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">

        {/* Header */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
              Customer Retention
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Identify customers who need attention and discover growth opportunities.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRetentionData}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
          >
            Refresh
          </button>
        </div>


        {/* KPI Cards */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              At Risk
            </p>

            <h3 className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
              {segments.atRisk.length}
            </h3>

            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              30+ days inactive
            </p>
          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              VIP Customers
            </p>

            <h3 className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
              {segments.vip.length}
            </h3>

            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              High-value customers
            </p>
          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              New Customers
            </p>

            <h3 className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
              {segments.newCustomers.length}
            </h3>

            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              0–1 orders
            </p>
          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Returning
            </p>

            <h3 className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
              {segments.returning.length}
            </h3>

            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Repeat customers
            </p>
          </div>

        </div>


        {/* Growth Opportunities */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
              Customer Opportunities
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Customers with the strongest opportunity for re-engagement.
            </p>
          </div>


          {opportunities.length === 0 ? (

            <div className="p-8 text-center sm:p-10">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl dark:bg-green-500/10">
                🎉
              </div>

              <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No at-risk customers
              </h4>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your current customer base looks healthy.
              </p>

            </div>

          ) : (

            <>
              {/* Mobile cards */}

              <div className="divide-y divide-slate-200 dark:divide-slate-800 md:hidden">

                {opportunities.map((customer) => {
                  const segment =
                    getSegment(customer);

                  const risk =
                    getRiskLevel(customer);

                  return (
                    <div
                      key={customer.id}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">
                          <a
                            href={`/customers/${customer.id}`}
                            className="block truncate font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {customer.name}
                          </a>

                          {customer.email && (
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {customer.email}
                            </p>
                          )}
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${risk.className}`}
                        >
                          {risk.label}
                        </span>

                      </div>


                      <div className="mt-4 flex flex-wrap gap-2">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${segment.className}`}
                        >
                          {segment.name}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {Number(
                            customer.total_orders || 0
                          )} orders
                        </span>

                      </div>


                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Lifetime Value
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            $
                            {Number(
                              customer.total_spent || 0
                            ).toFixed(2)}
                          </p>
                        </div>


                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Last Order
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {customer.daysSinceLastOrder !== null
                              ? `${customer.daysSinceLastOrder} days ago`
                              : "Never"}
                          </p>
                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>


              {/* Desktop table */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[760px] text-left">

                  <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">

                    <tr>

                      <th className="px-6 py-4 font-medium">
                        Customer
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Segment
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Orders
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Lifetime Value
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Last Order
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Risk
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {opportunities.map(
                      (customer) => {
                        const segment =
                          getSegment(customer);

                        const risk =
                          getRiskLevel(customer);

                        return (
                          <tr
                            key={customer.id}
                            className="border-b border-slate-200 transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                          >

                            <td className="px-6 py-4">

                              <a
                                href={`/customers/${customer.id}`}
                                className="font-medium text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                              >
                                {customer.name}
                              </a>

                              {customer.email && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {customer.email}
                                </p>
                              )}

                            </td>


                            <td className="px-6 py-4">

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${segment.className}`}
                              >
                                {segment.name}
                              </span>

                            </td>


                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                              {Number(
                                customer.total_orders || 0
                              )}
                            </td>


                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                              $
                              {Number(
                                customer.total_spent || 0
                              ).toFixed(2)}
                            </td>


                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">

                              {customer.last_order_at
                                ? new Date(
                                    customer.last_order_at
                                  ).toLocaleDateString()
                                : "Never"}

                              {customer.daysSinceLastOrder !==
                                null && (
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                  {
                                    customer.daysSinceLastOrder
                                  }{" "}
                                  days ago
                                </p>
                              )}

                            </td>


                            <td className="px-6 py-4">

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${risk.className}`}
                              >
                                {risk.label}
                              </span>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            </>

          )}

        </div>


        {/* Retention Segments */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-5">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  VIP Customers
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Highest-value customers.
                </p>

              </div>

              <div className="shrink-0 rounded-xl bg-purple-50 px-3 py-2 text-xl dark:bg-purple-500/10">
                👑
              </div>

            </div>

            <p className="mt-6 text-3xl font-bold text-purple-600 dark:text-purple-400">
              {segments.vip.length}
            </p>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Customers to prioritize for loyalty.
            </p>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  New Customers
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Customers with one or fewer orders.
                </p>

              </div>

              <div className="shrink-0 rounded-xl bg-green-50 px-3 py-2 text-xl dark:bg-green-500/10">
                🌱
              </div>

            </div>

            <p className="mt-6 text-3xl font-bold text-green-600 dark:text-green-400">
              {segments.newCustomers.length}
            </p>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Opportunity to drive the second order.
            </p>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Returning Customers
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Customers already coming back.
                </p>

              </div>

              <div className="shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-xl dark:bg-blue-500/10">
                🔄
              </div>

            </div>

            <p className="mt-6 text-3xl font-bold text-blue-600 dark:text-blue-400">
              {segments.returning.length}
            </p>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Potential candidates for loyalty campaigns.
            </p>

          </div>

        </div>


        {/* At Risk Customers */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">

            <h3 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
              At Risk Customers
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Customers with no order for at least 30 days.
            </p>

          </div>


          {segments.atRisk.length === 0 ? (

            <div className="p-8 text-center sm:p-10">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl dark:bg-green-500/10">
                ✅
              </div>

              <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No customers currently at risk
              </h4>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Keep your customers engaged.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-200 dark:divide-slate-800">

              {segments.atRisk.map(
                (customer) => (
                  <div
                    key={customer.id}
                    className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between"
                  >

                    <div className="min-w-0">

                      <a
                        href={`/customers/${customer.id}`}
                        className="block truncate font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {customer.name}
                      </a>

                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">

                        {Number(
                          customer.total_orders || 0
                        )}{" "}
                        orders · $
                        {Number(
                          customer.total_spent || 0
                        ).toFixed(2)}{" "}
                        lifetime value

                      </div>

                    </div>


                    <div className="flex flex-wrap items-center gap-2 md:justify-end">

                      <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                        {customer.daysSinceLastOrder}{" "}
                        days inactive
                      </span>

                      <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                        Needs attention
                      </span>

                    </div>

                  </div>
                )
              )}

            </div>

          )}

        </div>

      </div>
    </AppShell>
  );
}