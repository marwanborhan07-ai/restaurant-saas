import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type Automation = {
  id: string;
  restaurant_id: string;
  name: string;
  type: string;
  status: string;
  trigger_days: number;
  template_name: string;
  template_language: string;
  daily_limit: number;
};

type Customer = {
  id: string;
  name: string | null;
  phone: string | null;
  last_order_at: string | null;
  total_orders: number | null;
};

function normalizePhone(
  phone: string,
  countryCode?: string | null
) {
  let value = phone.replace(/[^\d]/g, "");

  if (value.startsWith("00")) {
    value = value.slice(2);
  }

  const country = (countryCode || "").toUpperCase();

  if (
    country === "EG" &&
    value.startsWith("01") &&
    value.length === 11
  ) {
    value = `20${value.slice(1)}`;
  }

  return value;
}

async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>
        ) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            // Ignore cookie write errors during server execution.
          }
        },
      },
    }
  );
}

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is incomplete."
    );
  }

  return createSupabaseAdmin(
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

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await getSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not logged in.",
          code: "NOT_AUTHENTICATED",
        },
        { status: 401 }
      );
    }

    const admin = getAdminClient();

    const {
      data: restaurant,
      error: restaurantError,
    } = await admin
      .from("restaurants")
      .select(
        "id, country_code, plan, subscription_status, trial_ends_at"
      )
      .eq("owner_id", user.id)
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        {
          success: false,
          error:
            restaurantError?.message ||
            "Restaurant not found.",
          code: "RESTAURANT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const paidPlans = new Set([
      "launch",
      "growth",
      "scale",
    ]);

    const hasActivePaidPlan =
      paidPlans.has(
        restaurant.plan || ""
      ) &&
      restaurant.subscription_status ===
        "active";

    const trialEndsAt =
      restaurant.trial_ends_at
        ? new Date(
            restaurant.trial_ends_at
          ).getTime()
        : 0;

    const trialIsActive =
      trialEndsAt > Date.now() &&
      (
        restaurant.plan === "trial" ||
        restaurant.subscription_status ===
          "trial"
      );

    if (
      !hasActivePaidPlan &&
      !trialIsActive
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your free trial has expired. Please upgrade your plan.",
          code: "TRIAL_EXPIRED",
        },
        { status: 403 }
      );
    }

    let body: {
      automationId?: string;
    } = {};

    try {
      body =
        (await request.json()) as {
          automationId?: string;
        };
    } catch {
      body = {};
    }

    let automationQuery =
      admin
        .from("whatsapp_automations")
        .select(
          "id, restaurant_id, name, type, status, trigger_days, template_name, template_language, daily_limit"
        )
        .eq(
          "restaurant_id",
          restaurant.id
        );

    if (body.automationId) {
      automationQuery =
        automationQuery.eq(
          "id",
          body.automationId
        );
    } else {
      automationQuery =
        automationQuery.eq(
          "status",
          "active"
        );
    }

    const {
      data: automationRows,
      error: automationError,
    } = await automationQuery;

    if (automationError) {
      return NextResponse.json(
        {
          success: false,
          error:
            automationError.message,
          code: "AUTOMATION_QUERY_FAILED",
        },
        { status: 500 }
      );
    }

    const automations =
      (automationRows ||
        []) as Automation[];

    if (automations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No automation is ready to run.",
        results: [],
      });
    }

    const {
      data: connection,
      error: connectionError,
    } = await admin
      .from("whatsapp_connections")
      .select(
        "phone_number_id, access_token, status"
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .eq(
        "status",
        "connected"
      )
      .limit(1)
      .maybeSingle();

    if (
      connectionError ||
      !connection
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            connectionError?.message ||
            "WhatsApp is not connected.",
          code: "WHATSAPP_NOT_CONNECTED",
        },
        { status: 400 }
      );
    }

    const graphVersion =
      process.env.WHATSAPP_GRAPH_API_VERSION ||
      "v25.0";

    const results: Array<{
      automationId: string;
      automationName: string;
      type: string;
      found: number;
      skipped: number;
      sent: number;
      failed: number;
      message?: string;
    }> = [];

    const runDay =
      new Date()
        .toISOString()
        .slice(0, 10);

    for (const automation of automations) {
      if (
        automation.type !==
        "winback"
      ) {
        results.push({
          automationId:
            automation.id,
          automationName:
            automation.name,
          type: automation.type,
          found: 0,
          skipped: 0,
          sent: 0,
          failed: 0,
          message:
            "Only winback automation is implemented in this first runner.",
        });

        continue;
      }

      const {
        data: existingRuns,
        error: existingRunsError,
      } = await admin
        .from(
          "whatsapp_automation_runs"
        )
        .select("customer_id")
        .eq(
          "automation_id",
          automation.id
        )
        .eq(
          "run_day",
          runDay
        );

      if (existingRunsError) {
        throw new Error(
          existingRunsError.message
        );
      }

      const alreadyProcessed =
        new Set(
          (existingRuns || []).map(
            (run) =>
              run.customer_id
          )
        );

      const cutoff =
        new Date(
          Date.now() -
            automation.trigger_days *
              24 *
              60 *
              60 *
              1000
        ).toISOString();

      const {
        data: customersData,
        error: customersError,
      } = await admin
        .from("customers")
        .select(
          "id, name, phone, last_order_at, total_orders"
        )
        .eq(
          "restaurant_id",
          restaurant.id
        )
        .not(
          "phone",
          "is",
          null
        )
        .not(
          "last_order_at",
          "is",
          null
        )
        .lte(
          "last_order_at",
          cutoff
        )
        .order(
          "last_order_at",
          {
            ascending: true,
          }
        )
        .limit(
          automation.daily_limit
        );

      if (customersError) {
        throw new Error(
          customersError.message
        );
      }

      const customers =
        (customersData ||
          []) as Customer[];

      let skipped = 0;
      let sent = 0;
      let failed = 0;

      for (const customer of customers) {
        if (
          alreadyProcessed.has(
            customer.id
          )
        ) {
          skipped += 1;
          continue;
        }

        const normalizedPhone =
          normalizePhone(
            customer.phone || "",
            restaurant.country_code
          );

        if (
          normalizedPhone.length < 8
        ) {
          skipped += 1;

          await admin
            .from(
              "whatsapp_automation_runs"
            )
            .insert({
              automation_id:
                automation.id,
              restaurant_id:
                restaurant.id,
              customer_id:
                customer.id,
              phone:
                customer.phone,
              status: "skipped",
              run_day: runDay,
              error_message:
                "Invalid phone number.",
            });

          continue;
        }

        const {
          data: run,
          error: runInsertError,
        } = await admin
          .from(
            "whatsapp_automation_runs"
          )
          .insert({
            automation_id:
              automation.id,
            restaurant_id:
              restaurant.id,
            customer_id:
              customer.id,
            phone:
              normalizedPhone,
            status: "pending",
            run_day: runDay,
          })
          .select("id")
          .single();

        if (runInsertError) {
          if (
            runInsertError.code ===
            "23505"
          ) {
            skipped += 1;
            continue;
          }

          throw new Error(
            runInsertError.message
          );
        }

        const response =
          await fetch(
            `https://graph.facebook.com/${graphVersion}/${connection.phone_number_id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${connection.access_token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                messaging_product:
                  "whatsapp",
                to: normalizedPhone,
                type: "template",
                template: {
                  name:
                    automation.template_name,
                  language: {
                    code:
                      automation.template_language,
                  },
                },
              }),
              cache: "no-store",
            }
          );

        const providerData =
          await response.json();

        if (!response.ok) {
          failed += 1;

          await admin
            .from(
              "whatsapp_automation_runs"
            )
            .update({
              status: "failed",
              error_message:
                providerData?.error
                  ?.message ||
                "WhatsApp message failed.",
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              run.id
            );

          continue;
        }

        const providerMessageId =
          providerData?.messages?.[0]
            ?.id || null;

        await admin
          .from(
            "whatsapp_automation_runs"
          )
          .update({
            status: "sent",
            provider_message_id:
              providerMessageId,
            sent_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            run.id
          );

        sent += 1;
      }

      await admin
        .from("whatsapp_automations")
        .update({
          last_run_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          automation.id
        );

      results.push({
        automationId:
          automation.id,
        automationName:
          automation.name,
        type: automation.type,
        found: customers.length,
        skipped,
        sent,
        failed,
      });
    }

    return NextResponse.json({
      success: true,
      runDay,
      results,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP AUTOMATION RUN ERROR]",
      error
    );

    if (error instanceof Error) {
      console.error(
        "[WHATSAPP AUTOMATION RUN MESSAGE]",
        error.message
      );

      console.error(
        "[WHATSAPP AUTOMATION RUN STACK]",
        error.stack
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected automation error.",
        code: "AUTOMATION_RUN_FAILED",
      },
      { status: 500 }
    );
  }
}