"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export default function SettingsPage() {
  const [accessToken, setAccessToken] =
    useState("");

  const [phoneNumberId, setPhoneNumberId] =
    useState("");

  const [apiVersion, setApiVersion] =
    useState("vXX.X");

  const [testing, setTesting] =
    useState(false);

  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    details?: {
      display_phone_number: string | null;
      verified_name: string | null;
      id: string;
    };
  } | null>(null);

  async function testConnection() {
    if (!accessToken.trim()) {
      setResult({
        type: "error",
        message:
          "Please enter your WhatsApp access token.",
      });

      return;
    }

    if (!phoneNumberId.trim()) {
      setResult({
        type: "error",
        message:
          "Please enter your WhatsApp phone number ID.",
      });

      return;
    }

    if (!apiVersion.trim()) {
      setResult({
        type: "error",
        message:
          "Please enter your WhatsApp API version.",
      });

      return;
    }

    try {
      setTesting(true);
      setResult(null);

      const response = await fetch(
        "/api/whatsapp/test",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            accessToken:
              accessToken.trim(),
            phoneNumberId:
              phoneNumberId.trim(),
            apiVersion:
              apiVersion.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "WhatsApp connection failed."
        );
      }

      setResult({
        type: "success",
        message:
          data.message ||
          "WhatsApp connection verified.",
        details: {
          id:
            data.data?.id ||
            phoneNumberId,
          display_phone_number:
            data.data
              ?.display_phone_number ||
            null,
          verified_name:
            data.data?.verified_name ||
            null,
        },
      });
    } catch (error) {
      setResult({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      });
    } finally {
      setTesting(false);
    }
  }

  function clearForm() {
    setAccessToken("");
    setPhoneNumberId("");
    setResult(null);
  }

  return (
    <AppShell title="Settings">
      <div className="space-y-6">

        {/* Header */}

        <div>

          <h2 className="text-xl font-semibold text-gray-900">
            Settings
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Configure your restaurant growth and messaging connections.
          </p>

        </div>


        {/* WhatsApp Connection */}

        <div className="rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-xl">
                    💬
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">
                    WhatsApp Business
                  </h3>

                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Connect your WhatsApp Business phone number for campaign delivery.
                </p>

              </div>


              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  result?.type ===
                  "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {result?.type ===
                "success"
                  ? "Connected"
                  : "Not Connected"}
              </span>

            </div>

          </div>


          <div className="p-6">

            <div className="grid gap-5 md:grid-cols-2">

              {/* Phone Number ID */}

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone Number ID
                </label>

                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) =>
                    setPhoneNumberId(
                      e.target.value
                    )
                  }
                  placeholder="123456789012345"
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-gray-400">
                  The phone number ID provided by Meta for your WhatsApp Business number.
                </p>

              </div>


              {/* API Version */}

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Graph API Version
                </label>

                <input
                  type="text"
                  value={apiVersion}
                  onChange={(e) =>
                    setApiVersion(
                      e.target.value
                    )
                  }
                  placeholder="vXX.X"
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-gray-400">
                  Enter the API version configured for your Meta app.
                </p>

              </div>


              {/* Access Token */}

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Access Token
                </label>

                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) =>
                    setAccessToken(
                      e.target.value
                    )
                  }
                  placeholder="Paste your Meta access token"
                  autoComplete="new-password"
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-gray-400">
                  This token is sent directly to the server for the connection test. It is not saved to the database by this screen.
                </p>

              </div>

            </div>


            {/* Actions */}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                onClick={testConnection}
                disabled={testing}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {testing
                  ? "Testing Connection..."
                  : "Test WhatsApp Connection"}
              </button>

              <button
                onClick={clearForm}
                disabled={testing}
                className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>

            </div>


            {/* Result */}

            {result && (
              <div
                className={`mt-6 rounded-xl border p-4 ${
                  result.type ===
                  "success"
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >

                <p
                  className={`text-sm font-medium ${
                    result.type ===
                    "success"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {result.message}
                </p>


                {result.details && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-lg bg-white p-3">

                      <p className="text-xs text-gray-400">
                        Phone Number
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {result.details
                          .display_phone_number ||
                          "Unavailable"}
                      </p>

                    </div>


                    <div className="rounded-lg bg-white p-3">

                      <p className="text-xs text-gray-400">
                        Verified Name
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {result.details
                          .verified_name ||
                          "Unavailable"}
                      </p>

                    </div>


                    <div className="rounded-lg bg-white p-3">

                      <p className="text-xs text-gray-400">
                        Phone ID
                      </p>

                      <p className="mt-1 truncate text-sm font-medium text-gray-900">
                        {result.details.id}
                      </p>

                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>


        {/* Security Notice */}

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

          <div className="flex gap-4">

            <div className="text-xl">
              🔐
            </div>

            <div>

              <h3 className="font-semibold text-yellow-900">
                Security
              </h3>

              <p className="mt-1 text-sm leading-6 text-yellow-800">
                Never expose your Meta access token in client-side code, public repositories, screenshots, or chat messages. This page sends the token to the server only for testing and does not persist it.
              </p>

            </div>

          </div>

        </div>


        {/* Future Delivery */}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <h3 className="text-lg font-semibold text-gray-900">
            Delivery Channels
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Additional messaging providers will appear here as they are connected.
          </p>


          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <div className="rounded-xl border bg-gray-50 p-5">

              <p className="font-semibold text-gray-900">
                WhatsApp
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Business messaging
              </p>

              <span className="mt-4 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                Setup
              </span>

            </div>


            <div className="rounded-xl border bg-gray-50 p-5">

              <p className="font-semibold text-gray-900">
                SMS
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Coming next
              </p>

              <span className="mt-4 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Not Connected
              </span>

            </div>


            <div className="rounded-xl border bg-gray-50 p-5">

              <p className="font-semibold text-gray-900">
                Email
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Coming next
              </p>

              <span className="mt-4 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Not Connected
              </span>

            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}