"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  name: string;
  email: string | null;
};

type Order = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  order_number: string;
  total: number;
  currency_code: string | null;
  status: string;
  created_at: string;
  customers: {
    name: string;
  } | null;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [total, setTotal] = useState("");
  const [currencyCode, setCurrencyCode] = useState("EGP");
  const [restaurantCurrency, setRestaurantCurrency] = useState("EGP");
  const [status, setStatus] = useState("completed");

  const supabase = createClient();

  async function getRestaurantId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You are not logged in.");
    }

    const { data: restaurant, error: restaurantError } =
      await supabase
        .from("restaurants")
        .select("id,currency_code")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (restaurantError || !restaurant) {
      throw new Error(
        restaurantError?.message || "Restaurant not found."
      );
    }

    const currentCurrency = restaurant.currency_code || "EGP";

    setRestaurantCurrency(currentCurrency);

    return restaurant.id;
  }

  async function refreshCustomerStats(customerUuid: string) {
    const restaurantId = await getRestaurantId();

    const { data, error } = await supabase
      .from("orders")
      .select("total, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("customer_id", customerUuid)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const customerOrders = data || [];

    const totalOrders = customerOrders.length;

    const totalSpent = customerOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const lastOrderAt =
      customerOrders.length > 0
        ? customerOrders[0].created_at
        : null;

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        total_orders: totalOrders,
        total_spent: totalSpent,
        last_order_at: lastOrderAt,
      })
      .eq("id", customerUuid)
      .eq("restaurant_id", restaurantId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const restaurantId = await getRestaurantId();

      const {
        data: customersData,
        error: customersError,
      } = await supabase
        .from("customers")
        .select("id, name, email")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (customersError) {
        throw new Error(customersError.message);
      }

      setCustomers(customersData || []);

      const {
        data: ordersData,
        error: ordersError,
      } = await supabase
        .from("orders")
        .select(`
          id,
          restaurant_id,
          customer_id,
          order_number,
          total,
          currency_code,
          status,
          created_at,
          customers (
            name
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      const formattedOrders = (ordersData || []).map((order) => ({
        ...order,
        customers: Array.isArray(order.customers)
          ? order.customers[0] ?? null
          : order.customers,
      }));

      setOrders(formattedOrders as Order[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const revenueByCurrency: Record<string, number> = {};

    orders.forEach((order) => {
      const currency =
        order.currency_code ||
        restaurantCurrency ||
        "EGP";

      revenueByCurrency[currency] =
        (revenueByCurrency[currency] || 0) +
        Number(order.total || 0);
    });

    const completed = orders.filter(
      (order) => order.status === "completed"
    ).length;

    const pending = orders.filter(
      (order) => order.status === "pending"
    ).length;

    return {
      totalOrders: orders.length,
      revenueByCurrency,
      completed,
      pending,
    };
  }, [orders, restaurantCurrency]);

  function openAddForm() {
    setEditingOrder(null);
    setCustomerId("");
    setTotal("");
    setCurrencyCode(restaurantCurrency);
    setStatus("completed");
    setShowForm(true);
  }

  function openEditForm(order: Order) {
    setEditingOrder(order);
    setCustomerId(order.customer_id);
    setTotal(String(order.total));
    setCurrencyCode(
      order.currency_code || restaurantCurrency
    );
    setStatus(order.status);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingOrder(null);
    setCustomerId("");
    setTotal("");
    setCurrencyCode(restaurantCurrency);
    setStatus("completed");
  }

  async function saveOrder() {
    if (!customerId) {
      alert("Please select a customer.");
      return;
    }

    if (!total || Number(total) <= 0) {
      alert("Please enter a valid order total.");
      return;
    }

    try {
      setSaving(true);

      const restaurantId = await getRestaurantId();

      if (editingOrder) {
        const oldCustomerId =
          editingOrder.customer_id;

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            customer_id: customerId,
            total: Number(total),
            currency_code: currencyCode,
            status,
          })
          .eq("id", editingOrder.id)
          .eq("restaurant_id", restaurantId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        if (oldCustomerId !== customerId) {
          await refreshCustomerStats(
            oldCustomerId
          );
        }

        await refreshCustomerStats(customerId);
      } else {
        const orderNumber =
          "ORD-" +
          Math.floor(
            100000 + Math.random() * 900000
          );

        const { error: insertError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_id: customerId,
            order_number: orderNumber,
            total: Number(total),
            currency_code: currencyCode,
            status,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        await refreshCustomerStats(customerId);
      }

      closeForm();

      await loadData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the order."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(order: Order) {
    const confirmed = window.confirm(
      `Delete ${order.order_number}?`
    );

    if (!confirmed) return;

    try {
      const restaurantId = await getRestaurantId();

      const { error: deleteError } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("restaurant_id", restaurantId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await refreshCustomerStats(
        order.customer_id
      );

      await loadData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the order."
      );
    }
  }

  function statusClass(value: string) {
    if (value === "completed") {
      return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400";
    }

    if (value === "pending") {
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
    }

    if (value === "processing") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    }

    if (value === "cancelled") {
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
    }

    return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300";
  }

  function formatAmount(amount: number) {
    return Number(amount || 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }

  return (
    <AppShell title="Orders">
      <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Orders
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Track and manage your restaurant orders.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
              {stats.totalOrders} Orders
            </div>

            <button
              onClick={openAddForm}
              className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98] dark:bg-slate-700 dark:hover:bg-slate-600 sm:w-auto"
            >
              + Add Order
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* Revenue */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                Total Revenue
              </p>

              <div className="mt-3 space-y-2">
                {Object.entries(
                  stats.revenueByCurrency
                ).length === 0 ? (
                  <div className="text-sm text-gray-400 dark:text-slate-500">
                    No revenue yet
                  </div>
                ) : (
                  Object.entries(
                    stats.revenueByCurrency
                  ).map(
                    ([currency, amount]) => (
                      <div
                        key={currency}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                          {currency}
                        </span>

                        <span className="text-lg font-bold text-green-600 dark:text-green-400 sm:text-xl">
                          {formatAmount(amount)}
                        </span>
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            {/* Total Orders */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                Total Orders
              </p>

              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalOrders}
                </h3>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl dark:bg-blue-950/50">
                  📦
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                Completed
              </p>

              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.completed}
                </h3>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-xl dark:bg-green-950/50">
                  ✓
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                Pending
              </p>

              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.pending}
                </h3>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-xl dark:bg-yellow-950/50">
                  ⏳
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingOrder
                    ? "Edit Order"
                    : "Add New Order"}
                </h3>

                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {editingOrder
                    ? `Update ${editingOrder.order_number}`
                    : "Create a new order for your restaurant."}
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-gray-500 transition hover:bg-slate-100 hover:text-gray-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

              {/* Customer */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Customer
                </label>

                <select
                  value={customerId}
                  onChange={(e) =>
                    setCustomerId(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">
                    Select Customer
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Order Total
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="500"
                  value={total}
                  onChange={(e) =>
                    setTotal(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Currency
                </label>

                <select
                  value={currencyCode}
                  onChange={(e) =>
                    setCurrencyCode(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                  <option value="QAR">QAR</option>
                  <option value="KWD">KWD</option>
                  <option value="BHD">BHD</option>
                  <option value="OMR">OMR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="INR">INR</option>
                  <option value="TRY">TRY</option>
                </select>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Default: {restaurantCurrency}
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="completed">
                    Completed
                  </option>

                  <option value="processing">
                    Processing
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={saveOrder}
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving
                  ? "Saving..."
                  : editingOrder
                  ? "Update Order"
                  : "Save Order"}
              </button>

              <button
                onClick={closeForm}
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
              >
                Cancel
              </button>
            </div>

          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 sm:p-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:p-6">
            Loading orders...
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          orders.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl dark:bg-blue-950/40">
                📦
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                No orders yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-slate-400">
                Create your first order to start tracking sales.
              </p>

              <button
                onClick={openAddForm}
                className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] sm:w-auto"
              >
                + Add First Order
              </button>

            </div>
          )}

        {/* Orders - Mobile Cards */}
        {!loading &&
          !error &&
          orders.length > 0 && (
            <div className="space-y-4 md:hidden">

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Orders
                </h3>

                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Your latest restaurant transactions.
                </p>
              </div>

              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-gray-900 dark:text-white">
                        {order.order_number}
                      </p>

                      <p className="mt-1 truncate text-sm text-gray-500 dark:text-slate-400">
                        {order.customers?.name ||
                          "Unknown Customer"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Total
                      </p>

                      <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                        {formatAmount(order.total)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Currency
                      </p>

                      <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                        {order.currency_code ||
                          restaurantCurrency}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                    <span className="text-gray-500 dark:text-slate-400">
                      {formatDate(order.created_at)}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          openEditForm(order)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteOrder(order)
                        }
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}

        {/* Orders - Desktop Table */}
        {!loading &&
          !error &&
          orders.length > 0 && (
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">

              <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Orders
                </h3>

                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Your latest restaurant transactions.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[850px] w-full text-left">

                  <thead className="border-b border-slate-200 bg-gray-50 text-sm text-gray-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold">
                        Order
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Customer
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Total
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Currency
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Status
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Date
                      </th>

                      <th className="px-6 py-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-slate-100 transition hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {order.order_number}
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {order.customers?.name ||
                              "Unknown Customer"}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {formatAmount(order.total)}
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {order.currency_code ||
                              restaurantCurrency}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-slate-400">
                          {formatDate(
                            order.created_at
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                openEditForm(order)
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteOrder(order)
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

            </div>
          )}

      </div>
    </AppShell>
  );
}