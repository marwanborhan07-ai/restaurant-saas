import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  }>;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing in .env.local"
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function toIso(timestamp?: string) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const seconds = Number(timestamp);

  if (!Number.isFinite(seconds)) {
    return new Date().toISOString();
  }

  return new Date(seconds * 1000).toISOString();
}

export async function GET(
  request: Request
) {
  const url = new URL(request.url);

  const mode =
    url.searchParams.get("hub.mode");

  const token =
    url.searchParams.get("hub.verify_token");

  const challenge =
    url.searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "WHATSAPP_WEBHOOK_VERIFY_TOKEN is missing.",
      },
      { status: 500 }
    );
  }

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    return new Response(
      challenge,
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Webhook verification failed.",
    },
    { status: 403 }
  );
}

export async function POST(
  request: Request
) {
  try {
    const payload = await request.json();

    console.log(
      "[WHATSAPP WEBHOOK]",
      JSON.stringify(payload, null, 2)
    );

    if (
      payload?.object !== "whatsapp_business_account"
    ) {
      return NextResponse.json(
        {
          ok: true,
          ignored: true,
        }
      );
    }

    const supabase = getAdminClient();

    let processed = 0;
    let ignored = 0;
    let failed = 0;

    const entries =
      Array.isArray(payload?.entry)
        ? payload.entry
        : [];

    for (const entry of entries) {
      const changes =
        Array.isArray(entry?.changes)
          ? entry.changes
          : [];

      for (const change of changes) {
        const value = change?.value;

        const statuses =
          Array.isArray(value?.statuses)
            ? value.statuses
            : [];

        for (const status of statuses as WhatsAppStatus[]) {

          const providerMessageId =
            status.id;

          const providerStatus =
            status.status;

          if (
            !providerMessageId ||
            !providerStatus
          ) {
            ignored += 1;
            continue;
          }

          const update: {
            status?: string;
            provider_status?: string;
            provider_error_code?: string | null;
            delivered_at?: string | null;
            read_at?: string | null;
            error_message?: string | null;
            updated_at?: string;
          } = {
            provider_status:
              providerStatus,
            updated_at:
              new Date().toISOString(),
          };

          if (
            providerStatus === "sent"
          ) {
            update.status = "sent";
          }

          if (
            providerStatus === "delivered"
          ) {
            update.status = "delivered";
            update.delivered_at =
              toIso(status.timestamp);
          }

          if (
            providerStatus === "read"
          ) {
            update.status = "read";
            update.read_at =
              toIso(status.timestamp);
          }

          if (
            providerStatus === "failed"
          ) {
            update.status = "failed";

            const firstError =
              status.errors?.[0];

            update.provider_error_code =
              firstError?.code
                ? String(firstError.code)
                : null;

            update.error_message =
              firstError?.message ||
              firstError?.error_data?.details ||
              firstError?.title ||
              "WhatsApp message failed.";
          }

          const {
            data: updatedRows,
            error: updateError,
          } = await supabase
            .from("campaign_recipients")
            .update(update)
            .eq(
              "provider_message_id",
              providerMessageId
            )
            .select("id");

          if (updateError) {
            console.error(
              "[WHATSAPP WEBHOOK UPDATE ERROR]",
              updateError
            );

            failed += 1;
            continue;
          }

          if (
            updatedRows &&
            updatedRows.length > 0
          ) {
            processed += updatedRows.length;
          } else {
            ignored += 1;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      ignored,
      failed,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP WEBHOOK ERROR]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}
