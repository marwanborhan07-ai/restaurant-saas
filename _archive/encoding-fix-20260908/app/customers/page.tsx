"use client";

import { useEffect, useState } from "react";
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
        restaurantError?.message ||
          "Restaurant not found."
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

      closeForm();
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
        name: "Regular",
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

  return (
    <AppShell title="Customers">
      <div className="space-y-6">

        {/* Header */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customers
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage your restaurant customers and view their activity.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              {customers.length} Customers
            </div>

            <button
              onClick={openAddForm}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + Add Customer
            </button>

          </div>

        </div>


        {/* Add Customer Form */}

        {showForm && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Customer
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Create a new customer profile.
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="text-gray-500 hover:text-gray-900 disabled:opacity-50"
              >
                âœ•
              </button>

            </div>


            <div className="grid gap-4 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Ahmed Mohamed"
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                />
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="ahmed@example.com"
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                />
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone
                </label>

                <input
                  type="text"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="01000000000"
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                />
              </div>

            </div>


            <div className="mt-5 flex gap-3">

              <button
                onClick={saveCustomer}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Customer"}
              </button>

              <button
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

            </div>

          </div>
        )}


        {/* Error */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}


        {/* Loading */}

        {loading && (
          <div className="rounded-2xl border bg-white p-6 text-gray-500 shadow-sm">
            Loading customers...
          </div>
        )}


        {/* Empty State */}

        {!loading &&
          !error &&
          customers.length === 0 && (
            <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                ðŸ‘¥
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No customers yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Add your first customer to start building your customer base.
              </p>

              <button
                onClick={openAddForm}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Add First Customer
              </button>

            </div>
          )}


        {/* Customers Table */}

        {!loading &&
          !error &&
          customers.length > 0 && (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

              <div className="border-b p-6">

                <h3 className="text-lg font-semibold text-gray-900">
                  Customer List
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  All customers connected to your restaurant.
                </p>

              </div>


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
                        Segment
                      </th>

                      <th className="px-6 py-4">
                        Orders
                      </th>

                      <th className="px-6 py-4">
                        Total Spent
                      </th>

                      <th className="px-6 py-4">
                        Last Order
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {customers.map((customer) => {
                      const segment =
                        getSegment(customer);

                      return (
                        <tr
                          key={customer.id}
                          className="border-b last:border-0 hover:bg-gray-50"
                        >

                          {/* Customer */}

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


                          {/* Contact */}

                          <td className="px-6 py-4">

                            <p className="text-sm text-gray-700">
                              {customer.phone ||
                                "No phone"}
                            </p>

                            {!customer.phone &&
                              !customer.email && (
                                <p className="text-xs text-gray-400">
                                  No contact info
                                </p>
                              )}

                          </td>


                          {/* Segment */}

                          <td className="px-6 py-4">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${segment.className}`}
                            >
                              {segment.name}
                            </span>

                          </td>


                          {/* Orders */}

                          <td className="px-6 py-4 font-medium text-gray-900">
                            {Number(
                              customer.total_orders || 0
                            )}
                          </td>


                          {/* Total Spent */}

                          <td className="px-6 py-4 font-medium text-gray-900">
                            $
                            {Number(
                              customer.total_spent || 0
                            ).toFixed(2)}
                          </td>


                          {/* Last Order */}

                          <td className="px-6 py-4 text-gray-600">

                            {customer.last_order_at
                              ? new Date(
                                  customer.last_order_at
                                ).toLocaleDateString()
                              : "No orders"}

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
