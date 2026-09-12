"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLanguage } from "@/components/language-context";
import { createClient } from "@/lib/supabase/client";

type Recipient = {
  id: string;
  customer_id: string;
  phone: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  customers:
    | {
        name: string;
      }
    | null;
};

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

type WhatsAppSignupData = {
  wabaId: string;
  phoneNumberId: string;
  businessId: string;
};

type WhatsAppSignupMessage = {
  type?: string;
  event?: string;
  data?: {
    waba_id?: string;
    phone_number_id?: string;
    business_id?: string;
  };
  version?: number;
};

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;

      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: {
          config_id: string;
          response_type: "code";
          override_default_response_type: boolean;
          auth_type?: "rerequest";
          extras?: {
            setup?: Record<string, unknown>;
          };
        }
      ) => void;
    };
  }
}

export default function WhatsAppPage() {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const supabase = useMemo(() => createClient(), []);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");

  const signupDataRef =
    useRef<WhatsAppSignupData | null>(null);

  const codeRef = useRef<string | null>(null);

  const finishTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const metaAppId =
    process.env.NEXT_PUBLIC_META_APP_ID || "";

  const metaConfigId =
    process.env.NEXT_PUBLIC_META_CONFIG_ID || "";

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          isArabic
            ? "\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648\u0644\u0627\u064b."
            : "You are not logged in."
        );
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
            (isArabic
              ? "\u0627\u0644\u0645\u0637\u0639\u0645 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f."
              : "Restaurant not found.")
        );
      }

      const {
        data,
        error: recipientsError,
      } = await supabase
        .from("campaign_recipients")
        .select(
          `
            id,
            customer_id,
            phone,
            status,
            sent_at,
            delivered_at,
            read_at,
            created_at,
            customers(name),
            campaigns!inner(restaurant_id)
          `
        )
        .eq(
          "campaigns.restaurant_id",
          restaurant.id
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (recipientsError) {
        throw new Error(
          recipientsError.message
        );
      }

      const formatted = (data || []).map((item) => ({
        ...item,
        customers: Array.isArray(item.customers)
          ? item.customers[0] ?? null
          : item.customers,
      }));

      setRecipients(
        formatted as Recipient[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639."
            : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function completeConnection() {
    const code = codeRef.current;
    const signupData =
      signupDataRef.current;

    if (!code || !signupData) {
      return;
    }

    setConnectionMessage(
      isArabic
        ? "\u062c\u0627\u0631\u064a \u062d\u0641\u0638 \u0627\u062a\u0635\u0627\u0644 WhatsApp..."
        : "Saving WhatsApp connection..."
    );

    try {
      const response = await fetch(
        "/api/whatsapp/connect",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            wabaId:
              signupData.wabaId,
            phoneNumberId:
              signupData.phoneNumberId,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            (isArabic
              ? "\u0641\u0634\u0644 \u0625\u0643\u0645\u0627\u0644 \u0631\u0628\u0637 WhatsApp."
              : "Failed to finish WhatsApp connection.")
        );
      }

      setConnectionMessage(
        isArabic
          ? "\u062a\u0645 \u0631\u0628\u0637 WhatsApp \u0628\u0646\u062c\u0627\u062d."
          : "WhatsApp connected successfully."
      );

      codeRef.current = null;
      signupDataRef.current = null;

      await loadData();
    } catch (err) {
      setConnectionMessage(
        err instanceof Error
          ? err.message
          : isArabic
            ? "\u0641\u0634\u0644 \u0631\u0628\u0637 WhatsApp."
            : "WhatsApp connection failed."
      );
    } finally {
      setConnecting(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [isArabic]);

  useEffect(() => {
    function handleSignupMessage(
      event: MessageEvent
    ) {
      if (
        !event.origin.endsWith(
          "facebook.com"
        )
      ) {
        return;
      }

      try {
        const payload =
          typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;

        const message =
          payload as WhatsAppSignupMessage;

        if (
          message.type !==
          "WA_EMBEDDED_SIGNUP"
        ) {
          return;
        }

        const wabaId =
          message.data?.waba_id || "";

        const phoneNumberId =
          message.data?.phone_number_id ||
          "";

        const businessId =
          message.data?.business_id ||
          "";

        if (
          wabaId ||
          phoneNumberId ||
          businessId
        ) {
          signupDataRef.current = {
            wabaId,
            phoneNumberId,
            businessId,
          };
        }

        if (
          message.event === "CANCEL"
        ) {
          setConnecting(false);

          setConnectionMessage(
            isArabic
              ? "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0631\u0628\u0637 WhatsApp."
              : "WhatsApp connection was cancelled."
          );

          return;
        }

        if (
          message.event === "ERROR"
        ) {
          setConnecting(false);

          setConnectionMessage(
            isArabic
              ? "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0631\u0628\u0637 WhatsApp."
              : "An error occurred during WhatsApp connection."
          );

          return;
        }

        if (
          message.event === "FINISH" ||
          message.event ===
            "FINISH_ONLY_WABA" ||
          message.event ===
            "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
        ) {
          if (codeRef.current) {
            completeConnection();
          }
        }
      } catch {
        // Ignore unrelated Facebook messages.
      }
    }

    window.addEventListener(
      "message",
      handleSignupMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleSignupMessage
      );

      if (finishTimerRef.current) {
        clearTimeout(
          finishTimerRef.current
        );
      }
    };
  }, [isArabic]);

  function initializeFacebookSDK() {
    if (
      !window.FB ||
      !metaAppId
    ) {
      return;
    }

    window.FB.init({
      appId: metaAppId,
      cookie: true,
      xfbml: true,
      version: "v25.0",
    });

    setSdkReady(true);
  }

  function launchSignup() {
    if (!window.FB) {
      alert(
        isArabic
          ? "Meta \u0644\u0627 \u062a\u0632\u0627\u0644 \u0642\u064a\u062f \u0627\u0644\u062a\u062d\u0645\u064a\u0644. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."
          : "Meta is still loading. Please try again."
      );

      return;
    }

    if (
      !metaAppId ||
      !metaConfigId
    ) {
      alert(
        isArabic
          ? "\u0625\u0639\u062f\u0627\u062f Meta \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644."
          : "Meta configuration is incomplete."
      );

      return;
    }

    if (connecting) {
      return;
    }

    signupDataRef.current = null;
    codeRef.current = null;

    setConnecting(true);
    setConnectionMessage(
      isArabic
        ? "\u062c\u0627\u0631\u064a \u0641\u062a\u062d \u0627\u062a\u0635\u0627\u0644 WhatsApp..."
        : "Opening WhatsApp connection..."
    );

    window.FB.login(
      (response) => {
        const code =
          response.authResponse?.code;

        if (!code) {
          setConnecting(false);

          setConnectionMessage(
            isArabic
              ? "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0631\u0628\u0637 WhatsApp."
              : "WhatsApp connection was not completed."
          );

          return;
        }

        codeRef.current = code;

        /*
         * Meta's WA_EMBEDDED_SIGNUP event may
         * arrive immediately before or after the
         * FB.login callback.
         *
         * Wait briefly for that event if needed.
         */

        if (
          signupDataRef.current
        ) {
          completeConnection();
          return;
        }

        if (finishTimerRef.current) {
          clearTimeout(
            finishTimerRef.current
          );
        }

        finishTimerRef.current =
          setTimeout(() => {
            if (
              signupDataRef.current &&
              codeRef.current
            ) {
              completeConnection();
            } else {
              setConnecting(false);

              setConnectionMessage(
                isArabic
                  ? "\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642\u060c \u0644\u0643\u0646 \u0644\u0645 \u062a\u0635\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u062d\u0633\u0627\u0628 WhatsApp. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."
                  : "Authorization completed, but WhatsApp account details were not received. Please try again."
              );
            }
          }, 1500);
      },
      {
        config_id: metaConfigId,
        response_type: "code",
        override_default_response_type:
          true,
        auth_type: "rerequest",
        extras: {
          setup: {},
        },
      }
    );
  }

  const total = recipients.length;

  const sent = recipients.filter(
    (item) =>
      item.status === "sent" ||
      item.status === "delivered" ||
      item.status === "read"
  ).length;

  const delivered = recipients.filter(
    (item) =>
      item.status === "delivered" ||
      item.status === "read"
  ).length;

  const read = recipients.filter(
    (item) =>
      item.status === "read"
  ).length;

  const failed = recipients.filter(
    (item) =>
      item.status === "failed"
  ).length;

  if (loading) {
    return (
      <>
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onLoad={
            initializeFacebookSDK
          }
        />

        <AppShell
          title="WhatsApp"
          titleKey="whatsappTitle"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {isArabic
              ? "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 WhatsApp..."
              : "Loading WhatsApp..."}
          </div>
        </AppShell>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onLoad={
            initializeFacebookSDK
          }
        />

        <AppShell
          title="WhatsApp"
          titleKey="whatsappTitle"
        >
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        </AppShell>
      </>
    );
  }

  return (
    <>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={
          initializeFacebookSDK
        }
      />

      <AppShell
        title="WhatsApp"
        titleKey="whatsappTitle"
      >
        <div
          dir={
            isArabic ? "rtl" : "ltr"
          }
          className="space-y-6"
        >
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <svg
                      className="h-7 w-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
                      <path d="M9 8.5c.3-.4.7-.4 1-.1l1 1c.3.3.3.7 0 1l-.5.5c.8 1.4 1.8 2.3 3.2 3l.5-.5c.3-.3.7-.3 1 0l1 1c.3.3.3.8-.1 1.1-.5.5-1.1.7-1.8.5-2.1-.5-5.2-3.6-5.7-5.7-.2-.7 0-1.3.4-1.8Z" />
                    </svg>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {isArabic
                        ? "\u0627\u0631\u0628\u0637 WhatsApp \u0628\u0645\u0637\u0639\u0645\u0643"
                        : "Connect WhatsApp to your restaurant"}
                    </h2>

                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />

                      {sdkReady
                        ? isArabic
                          ? "\u062c\u0627\u0647\u0632 \u0644\u0644\u0631\u0628\u0637"
                          : "Ready to connect"
                        : isArabic
                          ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644"
                          : "Loading"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {isArabic
                      ? "\u0627\u0631\u0628\u0637 \u062d\u0633\u0627\u0628 WhatsApp Business \u0627\u0644\u062e\u0627\u0635 \u0628\u0645\u0637\u0639\u0645\u0643 \u0628\u062f\u0648\u0646 \u0625\u062f\u062e\u0627\u0644 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u062a\u0642\u0646\u064a\u0629."
                      : "Connect your restaurant's WhatsApp Business account without entering technical settings."}
                  </p>

                  {connectionMessage && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                      {connectionMessage}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    launchSignup
                  }
                  disabled={
                    !sdkReady ||
                    connecting
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 16V4M7 9l5-5 5 5" />
                    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
                  </svg>

                  {connecting
                    ? isArabic
                      ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0631\u0628\u0637..."
                      : "Connecting..."
                    : isArabic
                      ? "\u0631\u0628\u0637 WhatsApp"
                      : "Connect WhatsApp"}
                </button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    1.{" "}
                    {isArabic
                      ? "\u0627\u062e\u062a\u0631 \u062d\u0633\u0627\u0628\u0643"
                      : "Choose your account"}
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {isArabic
                      ? "\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u062d\u0633\u0627\u0628 Meta \u0627\u0644\u062e\u0627\u0635 \u0628\u0639\u0645\u0644\u0643."
                      : "Sign in with the Meta account for your business."}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    2.{" "}
                    {isArabic
                      ? "\u0627\u062e\u062a\u0631 WhatsApp"
                      : "Choose WhatsApp"}
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {isArabic
                      ? "\u0627\u062e\u062a\u0631 \u062d\u0633\u0627\u0628 WhatsApp Business \u0648\u0631\u0642\u0645 \u0627\u0644\u0645\u0637\u0639\u0645."
                      : "Choose your restaurant's WhatsApp Business account and number."}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    3.{" "}
                    {isArabic
                      ? "\u0623\u0646\u062a \u062c\u0627\u0647\u0632"
                      : "You're ready"}
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {isArabic
                      ? "\u0627\u0628\u062f\u0623 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062d\u0645\u0644\u0627\u062a \u0645\u0646 \u062f\u0627\u062e\u0644 \u0627\u0644\u0646\u0638\u0627\u0645."
                      : "Start sending campaigns from inside the app."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isArabic
                  ? "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0631\u0633\u0627\u0626\u0644"
                  : "Total messages"}
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {total}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isArabic
                  ? "\u062a\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644"
                  : "Sent"}
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                {sent}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isArabic
                  ? "\u062a\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644"
                  : "Delivered"}
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {delivered}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isArabic
                  ? "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645"
                  : "Read"}
              </p>

              <p className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                {read}
              </p>

              {failed > 0 && (
                <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                  {failed}{" "}
                  {isArabic
                    ? "\u0627\u062e\u062a\u0631 \u062d\u0633\u0627\u0628\u0643"
                    : "failed messages"}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() =>
                setAdvancedOpen(
                  (value) => !value
                )
              }
              className="flex w-full items-center justify-between p-6 text-left"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {isArabic
                    ? "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u0642\u062f\u0645\u0629"
                    : "Advanced settings"}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isArabic
                    ? "\u0644\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646 \u0627\u0644\u0645\u062a\u0642\u062f\u0645\u064a\u0646 \u0641\u0642\u0637."
                    : "For advanced users only."}
                </p>
              </div>

              <span className="text-slate-400">
                {advancedOpen
                  ? "-"
                  : "+"}
              </span>
            </button>

            {advancedOpen && (
              <div className="border-t border-slate-200 p-6 dark:border-slate-800">
                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {isArabic
                      ? "\u062a\u0641\u0627\u0635\u064a\u0644 Meta \u0648Webhooks \u0648\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u0642\u0646\u064a\u0629 \u062a\u0638\u0644 \u0645\u062e\u0641\u064a\u0629 \u0639\u0646 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0639\u0627\u062f\u064a."
                      : "Meta, webhook, and technical connection details should remain hidden from normal users."}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </>
  );
}



