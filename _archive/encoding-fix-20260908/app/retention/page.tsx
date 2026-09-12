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
          "bg-purple-100 text-purple-700",
      };
    }

    if (totalOrders > 1) {
      return {
        name: "Returning",
        className:
          "bg-blue-100 text-blue-700",
      };
    }

    return {
      name: "New",
      className:
        "bg-green-100 text-green-700",
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
          "bg-red-100 text-red-700",
      };
    }

    if (
      customer.daysSinceLastOrder !== null &&
      customer.daysSinceLastOrder >= 30
    ) {
      return {
        label: "At Risk",
        className:
          "bg-orange-100 text-orange-700",
      };
    }

    return {
      label: "Healthy",
      className:
        "bg-green-100 text-green-700",
    };
  }

  if (loading) {
    return (
      <AppShell title="Retention">
        <div className="rounded-2xl border bg-white p-6 text-gray-500 shadow-sm">
          Loading retention data...
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Retention">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          <strong>Error:</strong> {error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Retention">
      <div className="space-y-6">

        {/* Header */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customer Retention
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Identify customers who need attention and discover growth opportunities.
            </p>
          </div>

          <button
            onClick={loadRetentionData}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>

        </div>


        {/* KPI Cards */}

        <div className="grid gap-5 md:grid-cols-4">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              At Risk
            </p>

            <h3 className="mt-2 text-3xl font-bold text-orange-600">
              {segments.atRisk.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              30+ days inactive
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              VIP Customers
            </p>

            <h3 className="mt-2 text-3xl font-bold text-purple-600">
              {segments.vip.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              High-value customers
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              New Customers
            </p>

            <h3 className="mt-2 text-3xl font-bold text-green-600">
              {segments.newCustomers.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              0â€“1 orders
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Returning
            </p>

            <h3 className="mt-2 text-3xl font-bold text-blue-600">
              {segments.returning.length}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
              Repeat customers
            </p>

          </div>

        </div>


        {/* Growth Opportunities */}

        <div className="rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-lg font-semibold text-gray-900">
              Customer Opportunities
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Customers with the strongest opportunity for re-engagement.
            </p>

          </div>


          {opportunities.length === 0 ? (

            <div className="p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
                ðŸŽ‰
              </div>

              <h4 className="mt-4 font-semibold text-gray-900">
                No at-risk customers
              </h4>

              <p className="mt-1 text-sm text-gray-500">
                Your current customer base looks healthy.
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
                      Segment
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

                    <th className="px-6 py-4">
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
                          className="border-b last:border-0 hover:bg-gray-50"
                        >

                          <td className="px-6 py-4">

                            <a
                              href={`/customers/${customer.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600"
                            >
                              {customer.name}
                            </a>

                            {customer.email && (
                              <p className="mt-1 text-xs text-gray-500">
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


                          <td className="px-6 py-4 font-medium text-gray-900">
                            {Number(
                              customer.total_orders || 0
                            )}
                          </td>


                          <td className="px-6 py-4 font-medium text-gray-900">
                            $
                            {Number(
                              customer.total_spent || 0
                            ).toFixed(2)}
                          </td>


                          <td className="px-6 py-4 text-gray-600">

                            {customer.last_order_at
                              ? new Date(
                                  customer.last_order_at
                                ).toLocaleDateString()
                              : "Never"}

                            {customer.daysSinceLastOrder !==
                              null && (
                              <p className="mt-1 text-xs text-gray-400">
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

          )}

        </div>


        {/* Retention Segments */}

        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="font-semibold text-gray-900">
                  VIP Customers
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Highest-value customers.
                </p>

              </div>

              <div className="rounded-xl bg-purple-50 px-3 py-2 text-xl">
                ðŸ‘‘
              </div>

            </div>

            <p className="mt-6 text-3xl font-bold text-purple-600">
              {segments.vip.length}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Customers to prioritize for loyalty.
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="font-semibold text-gray-900">
                  New Customers
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Customers with one or fewer orders.
                </p>

              </div>

              <div className="rounded-xl bg-green-50 px-3 py-2 text-xl">
                ðŸŒ±
              </div>

            </div>

            <p className="mt-6 text-3xl font-bold text-green-600">
              {segments.newCustomers.length}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Opportunity to drive the second order.
            </p>

          </div>


          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="font-semibold text-gray-900">
                  Returning Customers
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Customers already coming back.
                </p>

              </div>

              <div className="rounded-xl bg-blue-50 px-3 py-2 text-xl">
                ðŸ”„
              </div>

            </div>

            <p className="mt-6 text-3xl font-bold text-blue-600">
              {segments.returning.length}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Potential candidates for loyalty campaigns.
            </p>

          </div>

        </div>


        {/* At Risk Customers */}

        <div className="rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-lg font-semibold text-gray-900">
              At Risk Customers
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Customers with no order for at least 30 days.
            </p>

          </div>


          {segments.atRisk.length === 0 ? (

            <div className="p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
                âœ…
              </div>

              <h4 className="mt-4 font-semibold text-gray-900">
                No customers currently at risk
              </h4>

              <p className="mt-1 text-sm text-gray-500">
                Keep your customers engaged.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {segments.atRisk.map(
                (customer) => (
                  <div
                    key={customer.id}
                    className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                  >

                    <div>

                      <a
                        href={`/customers/${customer.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {customer.name}
                      </a>

                      <div className="mt-1 text-sm text-gray-500">

                        {Number(
                          customer.total_orders || 0
                        )}{" "}
                        orders Â· $
                        {Number(
                          customer.total_spent || 0
                        ).toFixed(2)}{" "}
                        lifetime value

                      </div>

                    </div>


                    <div className="flex items-center gap-3">

                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                        {customer.daysSinceLastOrder}{" "}
                        days inactive
                      </span>

                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
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
