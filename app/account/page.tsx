"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-context";
import { COUNTRIES } from "@/lib/currency/countries";

type Restaurant = {
  id: string;
  name: string | null;
  plan: string | null;
  subscription_status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  country_code: string | null;
  currency_code: string | null;
};

export default function AccountPage() {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [customersCount, setCustomersCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);

  const [countryCode, setCountryCode] = useState("EG");
  const [currencyCode, setCurrencyCode] = useState("EGP");

  const [savingLocation, setSavingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState("");
  const [locationError, setLocationError] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email || "");
      setUserId(user.id);

      const { data: restaurantData } =
        await supabase
          .from("restaurants")
          .select(
            "id,name,plan,subscription_status,trial_started_at,trial_ends_at,country_code,currency_code"
          )
          .eq("owner_id", user.id)
          .order("created_at", {
            ascending: true,
          })
          .limit(1)
          .maybeSingle();

      if (!restaurantData) {
        setLoading(false);
        return;
      }

      const normalizedRestaurant =
        restaurantData as Restaurant;

      setRestaurant(normalizedRestaurant);

      setCountryCode(
        normalizedRestaurant.country_code || "EG"
      );

      setCurrencyCode(
        normalizedRestaurant.currency_code || "EGP"
      );

      const [
        { count: customers },
        { count: orders },
        { count: campaigns },
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "restaurant_id",
            normalizedRestaurant.id
          ),

        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "restaurant_id",
            normalizedRestaurant.id
          ),

        supabase
          .from("campaigns")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "restaurant_id",
            normalizedRestaurant.id
          ),
      ]);

      setCustomersCount(customers || 0);
      setOrdersCount(orders || 0);
      setCampaignsCount(campaigns || 0);

      setLoading(false);
    }

    loadAccount();
  }, []);

  function handleCountryChange(code: string) {
    const country = COUNTRIES.find(
      (item) => item.code === code
    );

    setCountryCode(code);

    if (country) {
      setCurrencyCode(country.currency);
    }

    setLocationSuccess("");
    setLocationError("");
  }

  async function saveLocation() {
    try {
      setSavingLocation(true);
      setLocationSuccess("");
      setLocationError("");

      const response = await fetch(
        "/api/account/location",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            countryCode,
            currencyCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isArabic
              ? "فشل حفظ الدولة والعملة."
              : "Failed to save country and currency.")
        );
      }

      setRestaurant((current) =>
        current
          ? {
              ...current,
              country_code: countryCode,
              currency_code: currencyCode,
            }
          : current
      );

      setLocationSuccess(
        isArabic
          ? "تم حفظ الدولة والعملة بنجاح."
          : "Country and currency saved successfully."
      );
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : isArabic
            ? "حدث خطأ غير متوقع."
            : "Something went wrong."
      );
    } finally {
      setSavingLocation(false);
    }
  }

  const plan =
    restaurant?.plan || "trial";

  const status =
    restaurant?.subscription_status || "trial";

  const planLabel =
    plan === "growth"
      ? "Growth"
      : plan === "scale"
        ? "Scale"
        : plan === "launch"
          ? "Launch"
          : isArabic
            ? "\u062a\u062c\u0631\u064a\u0628\u064a"
            : "Free Trial";

  const statusLabel =
    status === "active"
      ? isArabic
        ? "\u0646\u0634\u0637"
        : "Active"
      : status === "trial"
        ? isArabic
          ? "\u0641\u062a\u0631\u0629 \u062a\u062c\u0631\u064a\u0628\u064a\u0629"
          : "Trial"
        : status;

  const selectedCountry =
    COUNTRIES.find(
      (country) =>
        country.code === countryCode
    ) || null;

  const formatDate = (
    value: string | null
  ) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString(
      isArabic ? "ar-EG" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  if (loading) {
    return (
      <AppShell
        title={
          isArabic
            ? "\u0627\u0644\u062d\u0633\u0627\u0628"
            : "Account"
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {isArabic
            ? "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628..."
            : "Loading account details..."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        isArabic
          ? "\u0627\u0644\u062d\u0633\u0627\u0628"
          : "Account"
      }
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isArabic
              ? "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u0633\u0627\u0628"
              : "Account Overview"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isArabic
              ? "\u0643\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u062d\u0633\u0627\u0628\u0643 \u0648\u0627\u0634\u062a\u0631\u0627\u0643\u0643 \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f."
              : "Your profile, restaurant, subscription, and usage in one place."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {isArabic
                ? "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a"
                : "Profile"}
            </h3>

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {isArabic
                    ? "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a"
                    : "Email"}
                </div>

                <div className="mt-1 text-sm font-medium text-slate-900">
                  {email || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  User ID
                </div>

                <div className="mt-1 break-all text-xs text-slate-500">
                  {userId || "—"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {isArabic
                ? "\u0627\u0644\u0645\u0637\u0639\u0645"
                : "Restaurant"}
            </h3>

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {isArabic
                    ? "\u0627\u0644\u0627\u0633\u0645"
                    : "Restaurant Name"}
                </div>

                <div className="mt-1 text-sm font-medium text-slate-900">
                  {restaurant?.name ||
                    (isArabic
                      ? "\u0645\u0637\u0639\u0645\u064a"
                      : "My Restaurant")}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Restaurant ID
                </div>

                <div className="mt-1 break-all text-xs text-slate-500">
                  {restaurant?.id || "—"}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isArabic
                ? "\u0627\u0644\u062f\u0648\u0644\u0629 \u0648\u0627\u0644\u0639\u0645\u0644\u0629"
                : "Country & Currency"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {isArabic
                ? "\u0627\u062e\u062a\u0631 \u062f\u0648\u0644\u0629 \u0645\u0637\u0639\u0645\u0643. \u0633\u064a\u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0641\u064a \u0627\u0644\u062a\u0633\u0639\u064a\u0631."
                : "Choose your restaurant country. Pricing will use its local currency."}
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-900">
                {isArabic
                  ? "\u0627\u0644\u062f\u0648\u0644\u0629"
                  : "Country"}
              </label>

              <select
                value={countryCode}
                onChange={(e) =>
                  handleCountryChange(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {COUNTRIES.map((country) => (
                  <option
                    key={country.code}
                    value={country.code}
                  >
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900">
                {isArabic
                  ? "\u0627\u0644\u0639\u0645\u0644\u0629"
                  : "Currency"}
              </label>

              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-semibold text-slate-900">
                  {selectedCountry?.currency ||
                    currencyCode}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {selectedCountry?.currencySymbol ||
                    currencyCode}
                </div>
              </div>
            </div>
          </div>

          {locationSuccess && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
              {locationSuccess}
            </div>
          )}

          {locationError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {locationError}
            </div>
          )}

          <button
            type="button"
            onClick={saveLocation}
            disabled={savingLocation}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingLocation
              ? isArabic
                ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..."
                : "Saving..."
              : isArabic
                ? "\u062d\u0641\u0638 \u0627\u0644\u062f\u0648\u0644\u0629 \u0648\u0627\u0644\u0639\u0645\u0644\u0629"
                : "Save Country & Currency"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {isArabic
                  ? "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643"
                  : "Subscription"}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {isArabic
                  ? "\u062d\u0627\u0644\u0629 \u0627\u0634\u062a\u0631\u0627\u0643\u0643 \u0627\u0644\u062d\u0627\u0644\u064a\u0629."
                  : "Your current subscription status."}
              </p>
            </div>

            <a
              href="/billing"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {isArabic
                ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643"
                : "Manage Subscription"}
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Plan
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {planLabel}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Status
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {statusLabel}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Trial Started
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {formatDate(
                  restaurant?.trial_started_at ||
                    null
                )}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Trial Ends
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {formatDate(
                  restaurant?.trial_ends_at ||
                    null
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            {isArabic
              ? "\u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645"
              : "Usage"}
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="text-2xl font-bold text-slate-900">
                {customersCount}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {isArabic
                  ? "\u0627\u0644\u0639\u0645\u0644\u0627\u0621"
                  : "Customers"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <div className="text-2xl font-bold text-slate-900">
                {ordersCount}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {isArabic
                  ? "\u0627\u0644\u0637\u0644\u0628\u0627\u062a"
                  : "Orders"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <div className="text-2xl font-bold text-slate-900">
                {campaignsCount}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {isArabic
                  ? "\u0627\u0644\u062d\u0645\u0644\u0627\u062a"
                  : "Campaigns"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            {isArabic
              ? "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0633\u0631\u064a\u0639\u0629"
              : "Quick Actions"}
          </h3>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <a
              href="/billing"
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-sm font-semibold text-slate-900">
                {isArabic
                  ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643"
                  : "Manage Billing"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {isArabic
                  ? "\u062a\u0631\u0642\u064a\u0629 \u0627\u0644\u062e\u0637\u0629 \u0623\u0648 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643."
                  : "Upgrade or review your subscription."}
              </div>
            </a>

            <a
              href="/settings"
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-sm font-semibold text-slate-900">
                {isArabic
                  ? "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a"
                  : "Settings"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {isArabic
                  ? "\u0636\u0628\u0637 \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a."
                  : "Configure your system and connections."}
              </div>
            </a>

            <a
              href="/dashboard"
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-sm font-semibold text-slate-900">
                {isArabic
                  ? "\u0627\u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629"
                  : "Dashboard"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {isArabic
                  ? "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629."
                  : "Return to your growth dashboard."}
              </div>
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
