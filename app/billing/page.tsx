"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PLANS,
  type PlanKey,
} from "@/lib/subscription";
import { useLanguage } from "@/components/language-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency/pricing";

type Subscription = {
  subscription_status:
    | "trial"
    | "active"
    | "expired"
    | "cancelled";
  plan: PlanKey | "trial";
  trial_ends_at: string | null;
  paid_until: string | null;
};

type PaymentMethod =
  | "instapay"
  | "orange_cash"
  | "we_pay";

type PaymentRequest = {
  id: string;
  plan: PlanKey;
  amount: number;
  currency_code: string | null;
  exchange_rate: number | null;
  base_amount: number | null;
  payment_method: PaymentMethod;
  transaction_reference: string | null;
  proof_path: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type PricingResponse = {
  success: boolean;
  currencyCode: string;
  prices: Record<PlanKey, number>;
};

export default function BillingPage() {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [paymentRequests, setPaymentRequests] =
    useState<PaymentRequest[]>([]);

  const [countryCode, setCountryCode] = useState("EG");
  const [currencyCode, setCurrencyCode] = useState("EGP");

  const [localPrices, setLocalPrices] =
    useState<Record<PlanKey, number>>({
      launch: 0,
      growth: 0,
      scale: 0,
    });

  const [pricesLoading, setPricesLoading] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedPlan, setSelectedPlan] =
    useState<PlanKey | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("instapay");

  const [transactionReference, setTransactionReference] =
    useState("");

  const [proofFile, setProofFile] =
    useState<File | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadBilling() {
    try {
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select(
          "subscription_status,plan,trial_ends_at,paid_until,country_code,currency_code"
        )
        .eq("owner_id", user.id)
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      setSubscription(
        (restaurant || null) as Subscription | null
      );

      if (restaurant) {
        setCountryCode(
          restaurant.country_code || "EG"
        );

        setCurrencyCode(
          restaurant.currency_code || "EGP"
        );
      }

      const { data: requests } = await supabase
        .from("payment_requests")
        .select(
          "id,plan,amount,currency_code,exchange_rate,base_amount,payment_method,transaction_reference,proof_path,status,created_at"
        )
        .eq("owner_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      setPaymentRequests(
        (requests || []) as PaymentRequest[]
      );
    } catch (error) {
      console.error("Billing load error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPrices() {
    try {
      setPricesLoading(true);

      const response = await fetch(
        "/api/billing/prices",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as PricingResponse;

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          "Unable to load pricing"
        );
      }

      setCurrencyCode(
        data.currencyCode || "EGP"
      );

      setLocalPrices({
        launch: Number(
          data.prices?.launch || 0
        ),
        growth: Number(
          data.prices?.growth || 0
        ),
        scale: Number(
          data.prices?.scale || 0
        ),
      });
    } catch (error) {
      console.error(
        "Billing pricing error:",
        error
      );
    } finally {
      setPricesLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();
    loadPrices();
  }, []);

  const planEntries = Object.entries(
    PLANS
  ) as [
    PlanKey,
    (typeof PLANS)[PlanKey]
  ][];

  const currentPendingRequest =
    paymentRequests.find(
      (request) =>
        request.status === "pending"
    );

  function getLocalPrice(plan: PlanKey) {
    return Number(
      localPrices[plan] || 0
    );
  }

  function getPriceLabel(plan: PlanKey) {
    const price = getLocalPrice(plan);

    if (pricesLoading) {
      return isArabic
        ? "جاري التحميل..."
        : "Loading...";
    }

    if (!price) {
      return isArabic
        ? "غير متاح"
        : "Unavailable";
    }

    return formatCurrency(
      price,
      currencyCode,
      isArabic ? "ar-EG" : "en-US"
    );
  }

  function openPaymentModal(plan: PlanKey) {
    setError("");
    setSuccess("");
    setSelectedPlan(plan);
    setPaymentMethod("instapay");
    setTransactionReference("");
    setProofFile(null);
  }

  function closePaymentModal() {
    if (saving) return;

    setSelectedPlan(null);
    setTransactionReference("");
    setProofFile(null);
    setError("");
  }

  function getPaymentDetails(
    method: PaymentMethod
  ) {
    if (method === "instapay") {
      return {
        title: "InstaPay",
        identifier:
          process.env
            .NEXT_PUBLIC_INSTAPAY_IDENTIFIER ||
          (isArabic
            ? "بيانات InstaPay غير مضافة بعد"
            : "InstaPay details not configured yet"),
      };
    }

    if (method === "orange_cash") {
      return {
        title: "Orange Cash",
        identifier:
          process.env
            .NEXT_PUBLIC_ORANGE_CASH_NUMBER ||
          (isArabic
            ? "رقم Orange Cash غير مضاف بعد"
            : "Orange Cash number not configured yet"),
      };
    }

    return {
      title: "WE Pay",
      identifier:
        process.env
          .NEXT_PUBLIC_WE_PAY_NUMBER ||
        (isArabic
          ? "رقم WE Pay غير مضاف بعد"
          : "WE Pay number not configured yet"),
    };
  }

  async function submitPaymentRequest() {
    if (!selectedPlan) return;

    setError("");
    setSuccess("");

    if (!proofFile) {
      setError(
        isArabic
          ? "من فضلك ارفع إثبات الدفع."
          : "Please upload your payment proof."
      );
      return;
    }

    if (!transactionReference.trim()) {
      setError(
        isArabic
          ? "من فضلك أدخل رقم العملية."
          : "Please enter the transaction reference."
      );
      return;
    }

    if (currencyCode !== "EGP") {
      setError(
        isArabic
          ? "الدفع اليدوي متاح حاليًا للحسابات المصرية فقط."
          : "Manual payment is currently available for Egyptian accounts only."
      );
      return;
    }

    if (!localPrices[selectedPlan]) {
      setError(
        isArabic
          ? "سعر الباقة غير متاح حاليًا."
          : "Plan pricing is currently unavailable."
      );
      return;
    }

    try {
      setSaving(true);

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          isArabic
            ? "يجب تسجيل الدخول أولًا."
            : "You must be logged in."
        );
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedTypes.includes(proofFile.type)) {
        throw new Error(
          isArabic
            ? "الملف يجب أن يكون صورة أو PDF."
            : "The file must be an image or PDF."
        );
      }

      if (
        proofFile.size >
        5 * 1024 * 1024
      ) {
        throw new Error(
          isArabic
            ? "حجم الملف يجب ألا يتجاوز 5MB."
            : "The file must be smaller than 5MB."
        );
      }

      const { data: restaurant } =
        await supabase
          .from("restaurants")
          .select("id,currency_code")
          .eq("owner_id", user.id)
          .order("created_at", {
            ascending: true,
          })
          .limit(1)
          .maybeSingle();

      if (!restaurant) {
        throw new Error(
          isArabic
            ? "لم يتم العثور على المطعم."
            : "Restaurant not found."
        );
      }

      const extension =
        proofFile.name.split(".").pop() ||
        "bin";

      const storagePath =
        `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("payment-proofs")
          .upload(
            storagePath,
            proofFile,
            {
              contentType: proofFile.type,
              upsert: false,
            }
          );

      if (uploadError) {
        throw new Error(
          uploadError.message
        );
      }

      const response = await fetch(
        "/api/billing/create-request",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            plan: selectedPlan,
            paymentMethod,
            transactionReference:
              transactionReference.trim(),
            proofPath: storagePath,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isArabic
              ? "فشل إرسال طلب الدفع."
              : "Payment request failed.")
        );
      }

      setSuccess(
        isArabic
          ? "تم إرسال طلب الدفع بنجاح. سيتم مراجعته وتفعيل الباقة بعد التأكيد."
          : "Payment request submitted successfully. Your plan will be activated after review."
      );

      setSelectedPlan(null);
      setTransactionReference("");
      setProofFile(null);

      await loadBilling();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : isArabic
            ? "حدث خطأ غير متوقع."
            : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-50 p-8"
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ←{" "}
          {isArabic
            ? "العودة للوحة التحكم"
            : "Back to Dashboard"}
        </Link>

        <div className="mt-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">
            {isArabic
              ? "الباقات والاشتراك"
              : "Plans & Billing"}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-slate-500">
            {isArabic
              ? "أسعار ثابتة بعملة بلدك."
              : "Fixed pricing in your local currency."}
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {isArabic
                  ? "عملة الحساب"
                  : "Account Currency"}
              </div>

              <div className="mt-1 text-xl font-bold text-slate-900">
                {currencyCode}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                {countryCode}
                {" · "}
                {isArabic
                  ? "التسعير المحلي ثابت"
                  : "Fixed local pricing"}
              </div>
            </div>

            <Link
              href="/account"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              {isArabic
                ? "تغيير الدولة"
                : "Change Country"}
            </Link>
          </div>
        </div>

        {subscription &&
          subscription.subscription_status ===
            "trial" && (
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center">
              <div className="font-semibold text-blue-900">
                {isArabic
                  ? "أنت حاليًا في الفترة التجريبية المجانية"
                  : "You are currently on the free trial"}
              </div>

              <div className="mt-1 text-sm text-blue-700">
                {isArabic
                  ? "يمكنك الاشتراك في أي وقت أثناء أو بعد الفترة التجريبية."
                  : "You can subscribe during or after your free trial."}
              </div>
            </div>
          )}

        {currentPendingRequest && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="font-semibold text-amber-900">
              {isArabic
                ? "يوجد طلب دفع قيد المراجعة"
                : "Payment request under review"}
            </div>

            <div className="mt-2 text-sm text-amber-800">
              {currentPendingRequest.plan.toUpperCase()}
              {" · "}
              {Number(
                currentPendingRequest.amount
              ).toLocaleString(
                isArabic ? "ar-EG" : "en-US"
              )}
              {" "}
              {currentPendingRequest.currency_code ||
                "EGP"}
              {" · "}
              {currentPendingRequest.payment_method}
            </div>
          </div>
        )}

        {success && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-800">
            {success}
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {planEntries.map(
            ([key, plan]) => {
              const popular =
                key === "growth";

              const isCurrentPlan =
                subscription?.subscription_status ===
                  "active" &&
                subscription.plan === key;

              return (
                <div
                  key={key}
                  className={`relative rounded-3xl border bg-white p-7 shadow-sm ${
                    popular
                      ? "border-blue-500 ring-2 ring-blue-100"
                      : "border-slate-200"
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                      {isArabic
                        ? "الأكثر طلبًا"
                        : "MOST POPULAR"}
                    </div>
                  )}

                  <div className="text-sm font-semibold text-blue-600">
                    {plan.name}
                  </div>

                  <div className="mt-3">
                    <div className="text-4xl font-bold text-slate-900">
                      {getPriceLabel(key)}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {isArabic
                        ? "شهريًا"
                        : "per month"}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-400">
                    {isArabic
                      ? `السعر الأساسي: ${plan.price.toLocaleString("en-EG")} EGP`
                      : `Base price: ${plan.price.toLocaleString("en-EG")} EGP`}
                  </div>

                  <div className="mt-6 space-y-3 text-sm text-slate-600">
                    <div>
                      ✓ {plan.customerLimit.toLocaleString()}{" "}
                      {isArabic
                        ? "عميل"
                        : "customers"}
                    </div>

                    <div>
                      ✓ {plan.campaignLimit}{" "}
                      {isArabic
                        ? "حملات / شهر"
                        : "campaigns / month"}
                    </div>

                    <div>
                      ✓ {plan.whatsappLimit.toLocaleString()}{" "}
                      WhatsApp
                    </div>

                    <div>
                      ✓ {plan.automationLimit}{" "}
                      {isArabic
                        ? "أتمتة"
                        : "automations"}
                    </div>

                    <div>
                      ✓ {plan.userLimit}{" "}
                      {isArabic
                        ? "مستخدمين"
                        : "users"}
                    </div>

                    <div>
                      {plan.roiTracking
                        ? "✓"
                        : "—"}{" "}
                      {isArabic
                        ? "قياس ROI"
                        : "ROI Tracking"}
                    </div>

                    <div>
                      {plan.advancedAnalytics
                        ? "✓"
                        : "—"}{" "}
                      {isArabic
                        ? "تحليلات متقدمة"
                        : "Advanced Analytics"}
                    </div>

                    <div>
                      {plan.growthRecommendations
                        ? "✓"
                        : "—"}{" "}
                      {isArabic
                        ? "توصيات النمو"
                        : "Growth Recommendations"}
                    </div>

                    <div>
                      {plan.multiLocation
                        ? "✓"
                        : "—"}{" "}
                      Multi-Location
                    </div>

                    <div>
                      {plan.apiAccess
                        ? "✓"
                        : "—"}{" "}
                      API
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openPaymentModal(key)
                    }
                    disabled={
                      isCurrentPlan ||
                      !!currentPendingRequest ||
                      pricesLoading
                    }
                    className={`mt-8 w-full rounded-xl px-4 py-3 font-semibold transition ${
                      isCurrentPlan ||
                      pricesLoading
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : popular
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {isCurrentPlan
                      ? isArabic
                        ? "باقتك الحالية"
                        : "Current Plan"
                      : currentPendingRequest
                        ? isArabic
                          ? "لديك طلب قيد المراجعة"
                          : "Pending Request"
                        : isArabic
                          ? `الاشتراك في ${plan.name}`
                          : `Choose ${plan.name}`}
                  </button>
                </div>
              );
            }
          )}
        </div>

        {paymentRequests.length > 0 && (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {isArabic
                ? "طلبات الدفع"
                : "Payment Requests"}
            </h2>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-3 py-3">
                      Plan
                    </th>

                    <th className="px-3 py-3">
                      Amount
                    </th>

                    <th className="px-3 py-3">
                      Method
                    </th>

                    <th className="px-3 py-3">
                      Status
                    </th>

                    <th className="px-3 py-3">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paymentRequests.map(
                    (request) => (
                      <tr
                        key={request.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {request.plan}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {formatCurrency(
                            Number(
                              request.amount
                            ),
                            request.currency_code ||
                              "EGP",
                            isArabic
                              ? "ar-EG"
                              : "en-US"
                          )}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {request.payment_method}
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              request.status ===
                              "approved"
                                ? "bg-green-100 text-green-700"
                                : request.status ===
                                    "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-slate-500">
                          {new Date(
                            request.created_at
                          ).toLocaleDateString(
                            isArabic
                              ? "ar-EG"
                              : "en-US"
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            {isArabic
              ? "كيف يتم التفعيل؟"
              : "How activation works"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {currencyCode === "EGP"
              ? isArabic
                ? "بعد التحويل، أرسل رقم العملية وإثبات الدفع. تتم مراجعة الطلب ثم يتم تفعيل الباقة لمدة شهر."
                : "After payment, submit the transaction reference and proof. The request is reviewed and the plan is then activated for one month."
              : isArabic
                ? "السعر المعروض ثابت بعملة بلدك. الدفع الدولي سيتم تفعيله عبر بوابة الدفع عند تشغيلها."
                : "The displayed price is fixed in your local currency. International checkout will be enabled when the payment gateway is connected."}
          </p>
        </div>

        {loading && (
          <div className="mt-6 text-center text-sm text-slate-400">
            {isArabic
              ? "جاري تحميل حالة الاشتراك..."
              : "Loading subscription status..."}
          </div>
        )}
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isArabic
                    ? `الاشتراك في ${PLANS[selectedPlan].name}`
                    : `Subscribe to ${PLANS[selectedPlan].name}`}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getPriceLabel(selectedPlan)}
                  {" / "}
                  {isArabic
                    ? "شهر"
                    : "month"}
                </p>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {currencyCode !== "EGP" ? (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="font-semibold text-blue-900">
                  {isArabic
                    ? "الدفع بالعملة المحلية"
                    : "Local currency checkout"}
                </div>

                <div className="mt-1 text-sm leading-6 text-blue-700">
                  {isArabic
                    ? "سعر الباقة ثابت بعملة بلدك، لكن الدفع بهذه العملة سيتم بعد ربط بوابة الدفع."
                    : "The plan price is fixed in your local currency, but payment in that currency will be available after the payment gateway is connected."}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-900">
                    {isArabic
                      ? "طريقة الدفع"
                      : "Payment Method"}
                  </div>

                  <div className="mt-3 grid gap-3">
                    {(
                      [
                        [
                          "instapay",
                          "InstaPay",
                          "🟢",
                        ],
                        [
                          "orange_cash",
                          "Orange Cash",
                          "🟠",
                        ],
                        [
                          "we_pay",
                          "WE Pay",
                          "🔵",
                        ],
                      ] as [
                        PaymentMethod,
                        string,
                        string
                      ][]
                    ).map(
                      ([
                        method,
                        label,
                        icon,
                      ]) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() =>
                            setPaymentMethod(
                              method
                            )
                          }
                          className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                            paymentMethod ===
                            method
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span>{icon}</span>

                            <span className="font-medium text-slate-900">
                              {label}
                            </span>
                          </span>

                          <span>
                            {paymentMethod ===
                            method
                              ? "✓"
                              : "○"}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {isArabic
                      ? "حوّل المبلغ إلى"
                      : "Send payment to"}
                  </div>

                  <div className="mt-2 text-lg font-bold text-slate-900">
                    {
                      getPaymentDetails(
                        paymentMethod
                      ).title
                    }
                  </div>

                  <div className="mt-1 break-all text-sm font-medium text-blue-700">
                    {
                      getPaymentDetails(
                        paymentMethod
                      ).identifier
                    }
                  </div>

                  <div className="mt-3 text-lg font-bold text-slate-900">
                    {getPriceLabel(
                      selectedPlan
                    )}
                  </div>

                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    {isArabic
                      ? "تأكد أن مبلغ التحويل يساوي سعر الباقة بالضبط."
                      : "Make sure the transferred amount matches the plan price exactly."}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-sm font-semibold text-slate-900">
                    {isArabic
                      ? "رقم العملية"
                      : "Transaction Reference"}
                  </label>

                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(e) =>
                      setTransactionReference(
                        e.target.value
                      )
                    }
                    placeholder={
                      isArabic
                        ? "اكتب رقم العملية"
                        : "Enter transaction reference"
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div className="mt-5">
                  <label className="text-sm font-semibold text-slate-900">
                    {isArabic
                      ? "إثبات الدفع"
                      : "Payment Proof"}
                  </label>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(e) =>
                      setProofFile(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                    className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    {isArabic
                      ? "PNG / JPG / WEBP / PDF — بحد أقصى 5MB"
                      : "PNG / JPG / WEBP / PDF — max 5MB"}
                  </p>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    submitPaymentRequest
                  }
                  disabled={saving}
                  className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? isArabic
                      ? "جاري إرسال الطلب..."
                      : "Submitting..."
                    : isArabic
                      ? "إرسال طلب الدفع"
                      : "Submit Payment Request"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
