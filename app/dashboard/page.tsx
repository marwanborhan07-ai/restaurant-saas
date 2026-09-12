"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLanguage } from "@/components/language-context";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  name: string;
  total_orders: number | null;
  total_spent: number | null;
  last_order_at: string | null;
};

type Order = {
  id: string;
  customer_id: string;
  order_number: string;
  total: number;
  currency_code: string | null;
  status: string;
  created_at: string;
  customers:
    | {
        name: string;
      }
    | null;
};

export default function DashboardPage() {
  const { t, language } = useLanguage();

  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantCurrency, setRestaurantCurrency] =
    useState("EGP");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id,currency_code")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) {
        setLoading(false);
        return;
      }

      setRestaurantCurrency(
        restaurant.currency_code || "EGP"
      );

      const [
        { data: customersData },
        { data: ordersData },
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id,name,total_orders,total_spent,last_order_at"
          )
          .eq("restaurant_id", restaurant.id)
          .order("total_spent", {
            ascending: false,
          }),

        supabase
          .from("orders")
          .select(
            "id,customer_id,order_number,total,currency_code,status,created_at,customers(name)"
          )
          .eq("restaurant_id", restaurant.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      setCustomers(
        (customersData || []) as Customer[]
      );

      const formattedOrders = (
        ordersData || []
      ).map((order) => ({
        ...order,
        customers: Array.isArray(order.customers)
          ? order.customers[0] ?? null
          : order.customers,
      }));

      setOrders(formattedOrders as Order[]);
      setLoading(false);
    }

    loadDashboard();
  }, [supabase]);

  const totalCustomers = customers.length;

  const revenueByCurrency: Record<
    string,
    number
  > = {};

  const customerRevenue: Record<
    string,
    Record<string, number>
  > = {};

  const customerOrderCounts: Record<
    string,
    number
  > = {};

  orders.forEach((order) => {
    const currencyCode =
      order.currency_code ||
      restaurantCurrency ||
      "EGP";

    const amount = Number(order.total || 0);

    revenueByCurrency[currencyCode] =
      (revenueByCurrency[currencyCode] || 0) +
      amount;

    customerOrderCounts[order.customer_id] =
      (customerOrderCounts[order.customer_id] ||
        0) + 1;

    if (!customerRevenue[order.customer_id]) {
      customerRevenue[order.customer_id] = {};
    }

    customerRevenue[order.customer_id][
      currencyCode
    ] =
      (customerRevenue[order.customer_id][
        currencyCode
      ] || 0) + amount;
  });

  const vipCustomers = customers.filter(
    (customer) => {
      const spends =
        customerRevenue[customer.id] || {};

      const maxSpend =
        Object.values(spends).length > 0
          ? Math.max(...Object.values(spends))
          : 0;

      return (
        maxSpend >= 500 ||
        (customerOrderCounts[customer.id] || 0) >=
          5
      );
    }
  ).length;

  const totalOrders = orders.length;

  const topCustomers = [...customers]
    .sort((a, b) => {
      const aSpends = Object.values(
        customerRevenue[a.id] || {}
      );

      const bSpends = Object.values(
        customerRevenue[b.id] || {}
      );

      const aMaxSpend =
        aSpends.length > 0
          ? Math.max(...aSpends)
          : 0;

      const bMaxSpend =
        bSpends.length > 0
          ? Math.max(...bSpends)
          : 0;

      return bMaxSpend - aMaxSpend;
    })
    .slice(0, 5);

  function translateStatus(status: string) {
    const normalized = status.toLowerCase();

    const keyMap: Record<string, string> = {
      completed: "completed",
      pending: "pending",
      processing: "processing",
      cancelled: "cancelled",
      delivered: "delivered",
      confirmed: "confirmed",
    };

    return t(keyMap[normalized] || status);
  }

  return (
    <AppShell
      title="Dashboard"
      titleKey="dashboard"
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {t("loading")}
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
          
          {/* Overview */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
              {t("restaurantOverview")}
            </h2>

            <p className="mt-1 text-sm text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">
              {t("trackPerformance")}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            
            {/* VIP Customers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {t("vipCustomers")}
                  </div>

                  <div className="mt-1 text-2xl font-bold text-orange-500 sm:mt-2 sm:text-3xl">
                    {vipCustomers}
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 sm:h-14 sm:w-14 sm:rounded-2xl dark:bg-orange-950/40">
                  <svg
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M5 8.5 7.5 5l3 2 1.5-3 1.5 3 3-2L19 8.5V19H5V8.5Z" />
                    <path d="M8 12h8v2H8z" />
                  </svg>
                </div>

              </div>
            </div>

            {/* Total Customers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">

                <div className="min-w-0">
                  <div className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {t("totalCustomers")}
                  </div>

                  <div className="mt-1 text-2xl font-bold text-purple-600 sm:mt-2 sm:text-3xl dark:text-purple-400">
                    {totalCustomers}
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 sm:h-14 sm:w-14 sm:rounded-2xl dark:bg-purple-950/40 dark:text-purple-400">
                  <svg
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="9" cy="8" r="3" />
                    <circle cx="17" cy="9" r="2.5" />
                    <path d="M3.5 19c.7-3 2.5-4.5 5.5-4.5S13.8 16 14.5 19" />
                    <path d="M14 15.5c2.8-.2 5.2.9 6 3.5" />
                  </svg>
                </div>

              </div>
            </div>

            {/* Total Orders */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">

                <div className="min-w-0">
                  <div className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {t("totalOrders")}
                  </div>

                  <div className="mt-1 text-2xl font-bold text-blue-600 sm:mt-2 sm:text-3xl dark:text-blue-400">
                    {totalOrders}
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-14 sm:w-14 sm:rounded-2xl dark:bg-blue-950/40 dark:text-blue-400">
                  <svg
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M6 3h12l2 4v14H4V7l2-4Z" />
                    <path d="M4 7h16M9 11h6M9 15h6" />
                  </svg>
                </div>

              </div>
            </div>

            {/* Revenue */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {t("totalRevenue")}
                  </div>

                  <div className="mt-2 space-y-2 sm:mt-3">
                    {Object.entries(
                      revenueByCurrency
                    ).length === 0 ? (
                      <div className="text-sm text-slate-400">
                        {t("noData")}
                      </div>
                    ) : (
                      Object.entries(
                        revenueByCurrency
                      ).map(
                        ([currencyCode, amount]) => (
                          <div
                            key={currencyCode}
                            className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
                          >
                            <span className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-400">
                              {currencyCode}
                            </span>

                            <span className="text-lg font-bold text-emerald-600 sm:text-xl dark:text-emerald-400">
                              {Number(
                                amount
                              ).toLocaleString(
                                language === "ar"
                                  ? "ar-EG"
                                  : "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-14 sm:w-14 sm:rounded-2xl dark:bg-emerald-950/40 dark:text-emerald-400">
                  <svg
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 7v10M15 9.5c-.6-.8-1.5-1.2-2.7-1.2-1.5 0-2.5.7-2.5 1.8 0 2.8 5.5 1.2 5.5 4.1 0 1.1-1 1.9-2.6 1.9-1.2 0-2.2-.4-2.9-1.2" />
                  </svg>
                </div>

              </div>
            </div>

          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">

            {/* Top Customers */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

              <div className="border-b border-slate-200 p-4 sm:p-6 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                  {t("topCustomers")}
                </h3>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                  {t("highestSpending")}
                </p>
              </div>

              {topCustomers.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 sm:p-6 dark:text-slate-400">
                  {t("noData")}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">

                  {topCustomers.map(
                    (customer, index) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between gap-3 p-4 sm:gap-4 sm:p-6"
                      >

                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600 sm:h-10 sm:w-10 dark:bg-blue-950/40 dark:text-blue-300">
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900 sm:text-base dark:text-white">
                              {customer.name}
                            </div>

                            <div className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                              {customer.total_orders || 0}{" "}
                              {t("orders")}
                            </div>
                          </div>

                        </div>

                        <div className="shrink-0 text-right">

                          {Object.entries(
                            customerRevenue[
                              customer.id
                            ] || {}
                          ).map(
                            (
                              [
                                currencyCode,
                                amount,
                              ]
                            ) => (
                              <div
                                key={currencyCode}
                                className="whitespace-nowrap text-sm font-bold text-emerald-600 sm:text-base dark:text-emerald-400"
                              >
                                {Number(
                                  amount
                                ).toLocaleString(
                                  language === "ar"
                                    ? "ar-EG"
                                    : "en-US",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}{" "}

                                <span className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                                  {currencyCode}
                                </span>
                              </div>
                            )
                          )}

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </section>

            {/* Recent Orders */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

              <div className="border-b border-slate-200 p-4 sm:p-6 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                  {t("recentOrders")}
                </h3>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                  {t("latestOrders")}
                </p>
              </div>

              {orders.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 sm:p-6 dark:text-slate-400">
                  {t("noData")}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">

                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 p-4 sm:gap-4 sm:p-6"
                    >

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 sm:text-base dark:text-white">
                          {order.order_number}
                        </div>

                        <div className="mt-1 truncate text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                          {order.customers?.name ||
                            t("customer")}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">

                        <div className="whitespace-nowrap text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                          {Number(
                            order.total || 0
                          ).toLocaleString(
                            language === "ar"
                              ? "ar-EG"
                              : "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}{" "}

                          <span className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                            {order.currency_code ||
                              restaurantCurrency}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                          {translateStatus(
                            order.status
                          )}
                        </div>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </section>

          </div>

        </div>
      )}
    </AppShell>
  );
}