"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  restaurant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_orders: number | null;
  total_spent: number | null;
  last_order_at: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function getRestaurantId() {
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
        restaurantError?.message || "Restaurant not found."
      );
    }

    return restaurant.id;
  }

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();
      const restaurantId = await getRestaurantId();

      const {
        data,
        error: customersError,
      } = await supabase
        .from("customers")
        .select(`
          id,
          restaurant_id,
          name,
          email,
          phone,
          total_orders,
          total_spent,
          last_order_at
        `)
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true });

      if (customersError) {
        throw new Error(customersError.message);
      }

      setCustomers(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function openAddForm() {
    setName("");
    setEmail("");
    setPhone("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setName("");
    setEmail("");
    setPhone("");
  }

  async function saveCustomer() {
    if (!name.trim()) {
      alert("Please enter customer name.");
      return;
    }

    try {
      setSaving(true);

      const supabase = createClient();
      const restaurantId = await getRestaurantId();

      const { error: insertError } = await supabase
        .from("customers")
        .insert({
          restaurant_id: restaurantId,
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          total_orders: 0,
          total_spent: 0,
          last_order_at: null,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setShowForm(false);
      setName("");
      setEmail("");
      setPhone("");

      await loadCustomers();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating customer."
      );
    } finally {
      setSaving(false);
    }
  }

  function getSegment(customer: Customer) {
    const totalOrders = Number(customer.total_orders || 0);
    const totalSpent = Number(customer.total_spent || 0);

    if (totalSpent >= 500 || totalOrders >= 5) {
      return {
        name: "VIP",
        className:
          "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
      };
    }

    if (totalOrders > 1) {
      return {
        name: "Regular",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
      };
    }

    return {
      name: "New",
      className:
        "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    };
  }

  function formatMoney(value: number | null) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function formatDate(date: string | null) {
    if (!date) return "No orders";

    return new Date(date).toLocaleDateString();
  }

  return (
    <AppShell title="Customers">
      <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">

        {/* Header */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white">
              Customers
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage your restaurant customers and view their activity.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm">
              {customers.length} Customers
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              + Add Customer
            </button>
          </div>
        </div>

        {/* Add Customer Form */}

        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Add New Customer
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Create a new customer profile.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmed Mohamed"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmed@example.com"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Phone
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01000000000"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={saveCustomer}
                disabled={saving}
                className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Customer"}
              </button>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>

          </div>
        )}

        {/* Error */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:p-6 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading */}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Loading customers...
          </div>
        )}

        {/* Empty State */}

        {!loading && !error && customers.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl dark:bg-blue-950/50">
              👥
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No customers yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add your first customer to start building your customer base.
            </p>

            <button
              type="button"
              onClick={openAddForm}
              className="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98]"
            >
              + Add First Customer
            </button>

          </div>
        )}

        {/* Mobile Customer Cards */}

        {!loading && !error && customers.length > 0 && (
          <div className="space-y-3 md:hidden">

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Customer List
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                All customers connected to your restaurant.
              </p>
            </div>

            {customers.map((customer) => {
              const segment = getSegment(customer);

              return (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">
                      <h4 className="truncate font-semibold text-slate-900 dark:text-white">
                        {customer.name}
                      </h4>

                      {customer.email && (
                        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                          {customer.email}
                        </p>
                      )}

                      {customer.phone && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {customer.phone}
                        </p>
                      )}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${segment.className}`}
                    >
                      {segment.name}
                    </span>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Orders
                      </p>

                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {Number(customer.total_orders || 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total Spent
                      </p>

                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {formatMoney(customer.total_spent)}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Last Order
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(customer.last_order_at)}
                      </p>
                    </div>

                  </div>

                  <div className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                    View customer →
                  </div>

                </Link>
              );
            })}

          </div>
        )}

        {/* Desktop Table */}

        {!loading && !error && customers.length > 0 && (
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-900">

            <div className="border-b border-slate-200 p-5 lg:p-6 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Customer List
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                All customers connected to your restaurant.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full text-left">

                <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-medium lg:px-6">
                      Customer
                    </th>

                    <th className="px-5 py-4 font-medium lg:px-6">
                      Contact
                    </th>

                    <th className="px-5 py-4 font-medium lg:px-6">
                      Segment
                    </th>

                    <th className="px-5 py-4 font-medium lg:px-6">
                      Orders
                    </th>

                    <th className="px-5 py-4 font-medium lg:px-6">
                      Total Spent
                    </th>

                    <th className="px-5 py-4 font-medium lg:px-6">
                      Last Order
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => {
                    const segment = getSegment(customer);

                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >

                        <td className="px-5 py-4 lg:px-6">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-medium text-slate-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {customer.name}
                          </Link>

                          {customer.email && (
                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500 dark:text-slate-400">
                              {customer.email}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 lg:px-6">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {customer.phone || "No phone"}
                          </p>

                          {!customer.phone && !customer.email && (
                            <p className="mt-1 text-xs text-slate-400">
                              No contact info
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 lg:px-6">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${segment.className}`}
                          >
                            {segment.name}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-900 lg:px-6 dark:text-white">
                          {Number(customer.total_orders || 0)}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-900 lg:px-6 dark:text-white">
                          {formatMoney(customer.total_spent)}
                        </td>

                        <td className="px-5 py-4 text-slate-600 lg:px-6 dark:text-slate-400">
                          {formatDate(customer.last_order_at)}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>

          </div>
        )}

      </div>
    </AppShell>
  );
}