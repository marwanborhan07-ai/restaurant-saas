import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type Campaign = {
  id: string;
  restaurant_id: string;
  name: string;
  channel: string;
  message: string;
  status: string;
  scheduled_at: string | null;
  template_name: string | null;
  template_language: string | null;
  template_parameters: unknown;
};

type Recipient = {
  id: string;
  campaign_id: string;
  customer_id: string;
  phone: string | null;
  status: string;
};

type Customer = {
  id: string;
  name: string;
};

async function getSupabase() {
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
            options?: CookieOptions;
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
            // Ignore cookie write errors in route handler.
          }
        },
      },
    }
  );
}

function normalizePhone(phone: string) {
  const digits = String(phone || "").replace(
    /\D/g,
    ""
  );

  if (!digits) {
    return "";
  }

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (digits.startsWith("0")) {
    return `20${digits.slice(1)}`;
  }

  return digits;
}

function personalizeMessage(
  message: string,
  customerName: string
) {
  return message.replace(
    /\{\{name\}\}/gi,
    customerName || "Customer"
  );
}

async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  templateLanguage: string,
  customerName?: string,
  templateParameters?: unknown
) {
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  const apiVersion =
    process.env.WHATSAPP_GRAPH_API_VERSION ||
    "v25.0";

  if (!phoneNumberId) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID is missing in .env.local"
    );
  }

  if (!accessToken) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN is missing in .env.local"
    );
  }

  const normalizedPhone =
    normalizePhone(phone);

  if (!normalizedPhone) {
    throw new Error(
      "Recipient phone number is empty or invalid."
    );
  }

  const finalTemplateName =
    templateName?.trim() ||
    process.env.WHATSAPP_TEMPLATE_NAME ||
    "hello_world";

  const finalTemplateLanguage =
    templateLanguage?.trim() ||
    process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
    "en_US";

  const parameterList =
    Array.isArray(templateParameters)
      ? templateParameters
      : [];

  const bodyParameters = parameterList
    .map((parameter) => {
      if (parameter === "customer.name") {
        return {
          type: "text",
          text: customerName || "Customer",
        };
      }

      return null;
    })
    .filter(Boolean);

  const templatePayload: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: "body";
      parameters: Array<{
        type: "text";
        text: string;
      }>;
    }>;
  } = {
    name: finalTemplateName,
    language: {
      code: finalTemplateLanguage,
    },
  };

  if (bodyParameters.length > 0) {
    templatePayload.components = [
      {
        type: "body",
        parameters:
          bodyParameters as Array<{
            type: "text";
            text: string;
          }>,
      },
    ];
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "template",
        template: templatePayload,
      }),

      cache: "no-store",
    }
  );

  const data = await response.json();

  console.log("[WHATSAPP TEMPLATE]", {
    phoneNumberId,
    apiVersion,
    template: finalTemplateName,
    language: finalTemplateLanguage,
    parameters: parameterList,
    recipient: normalizedPhone,
    status: response.status,
    response: data,
  });

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error?.error_user_msg ||
        `WhatsApp API returned ${response.status}`
    );
  }

  return {
    messageId:
      data?.messages?.[0]?.id || null,
    response: data,
  };
}

export async function POST() {
  try {
    const supabase =
      await getSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "You are not logged in.",
        },
        { status: 401 }
      );
    }

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id, plan, subscription_status, trial_ends_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json(
        {
          ok: false,
          error:
            restaurantError?.message ||
            "Restaurant not found.",
        },
        { status: 404 }
      );
    }

    const restaurantData = restaurant as {
      id: string;
      plan: string | null;
      subscription_status: string | null;
      trial_ends_at: string | null;
    };

    const paidPlans = new Set(["launch", "growth", "scale"]);

    const hasActivePaidPlan =
      paidPlans.has(restaurantData.plan || "") &&
      restaurantData.subscription_status === "active";

    const trialEndsAt = restaurantData.trial_ends_at
      ? new Date(restaurantData.trial_ends_at).getTime()
      : 0;

    const trialIsActive =
      trialEndsAt > Date.now() &&
      (restaurantData.plan === "trial" ||
        restaurantData.subscription_status === "trial");

    if (!hasActivePaidPlan && !trialIsActive) {
      return NextResponse.json(
        {
          ok: false,
          error: "Your free trial has expired. Please upgrade your plan.",
          code: "TRIAL_EXPIRED",
        },
        { status: 403 }
      );
    }

    const nowIso =
      new Date().toISOString();

    const {
      data: campaigns,
      error: campaignsError,
    } = await supabase
      .from("campaigns")
      .select(`
        id,
        restaurant_id,
        name,
        channel,
        message,
        status,
        scheduled_at,
        template_name,
        template_language
      `)
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .eq("status", "scheduled")
      .not(
        "scheduled_at",
        "is",
        null
      )
      .lte(
        "scheduled_at",
        nowIso
      )
      .order("scheduled_at", {
        ascending: true,
      });

    if (campaignsError) {
      throw new Error(
        campaignsError.message
      );
    }

    if (
      !campaigns ||
      campaigns.length === 0
    ) {
      return NextResponse.json({
        ok: true,
        status: "NO_DUE_CAMPAIGNS",
        campaignsProcessed: 0,
        recipientsProcessed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        campaigns: [],
      });
    }

    let campaignsProcessed = 0;
    let recipientsProcessed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const campaignResults: Array<{
      campaignId: string;
      campaignName: string;
      sent: number;
      failed: number;
      skipped: number;
    }> = [];

    for (
      const campaign of campaigns as Campaign[]
    ) {
      if (
        campaign.channel !==
        "whatsapp"
      ) {
        skipped += 1;

        campaignResults.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          sent: 0,
          failed: 0,
          skipped: 1,
        });

        continue;
      }

      const {
        data: recipients,
        error: recipientsError,
      } = await supabase
        .from(
          "campaign_recipients"
        )
        .select(`
          id,
          campaign_id,
          customer_id,
          phone,
          status
        `)
        .eq(
          "campaign_id",
          campaign.id
        )
        .in("status", [
          "queued",
          "failed",
        ])
        .order("created_at", {
          ascending: true,
        });

      if (recipientsError) {
        throw new Error(
          recipientsError.message
        );
      }

      let campaignSent = 0;
      let campaignFailed = 0;
      let campaignSkipped = 0;

      for (
        const recipient of
          (recipients || []) as Recipient[]
      ) {
        recipientsProcessed += 1;

        const {
          data: claimedRecipient,
          error: claimError,
        } = await supabase
          .from(
            "campaign_recipients"
          )
          .update({
            status: "sending",
            error_message: null,
          })
          .eq(
            "id",
            recipient.id
          )
          .eq(
            "status",
            recipient.status
          )
          .select(`
            id,
            campaign_id,
            customer_id,
            phone,
            status
          `)
          .single();

        if (
          claimError ||
          !claimedRecipient
        ) {
          campaignSkipped += 1;
          skipped += 1;
          continue;
        }

        if (!recipient.phone) {
          await supabase
            .from(
              "campaign_recipients"
            )
            .update({
              status: "failed",
              error_message:
                "Customer has no phone number.",
            })
            .eq(
              "id",
              recipient.id
            );

          campaignFailed += 1;
          failed += 1;
          continue;
        }

        const {
          data: customer,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(`
            id,
            name
          `)
          .eq(
            "id",
            recipient.customer_id
          )
          .eq(
            "restaurant_id",
            restaurant.id
          )
          .single();

        if (
          customerError ||
          !customer
        ) {
          await supabase
            .from(
              "campaign_recipients"
            )
            .update({
              status: "failed",
              error_message:
                customerError?.message ||
                "Customer not found.",
            })
            .eq(
              "id",
              recipient.id
            );

          campaignFailed += 1;
          failed += 1;
          continue;
        }

        // Kept for compatibility with current campaign UI.
        // hello_world has no parameters.
        const personalizedMessage =
          personalizeMessage(
            campaign.message,
            (customer as Customer).name
          );

        console.log(
          "[CAMPAIGN] customer:",
          (customer as Customer).name
        );

        console.log(
          "[CAMPAIGN] messageLength:",
          personalizedMessage.length
        );

        try {
          const result =
            await sendWhatsAppTemplate(
              recipient.phone,
              campaign.template_name ||
                process.env.WHATSAPP_TEMPLATE_NAME ||
                "hello_world",
              campaign.template_language ||
                process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
                "en_US",
              (customer as Customer).name,
              campaign.template_parameters
            );

          const {
            error: recipientUpdateError,
          } = await supabase
            .from(
              "campaign_recipients"
            )
            .update({
              status: "sent",
              provider_message_id:
                result.messageId,
              sent_at:
                new Date().toISOString(),
              error_message: null,
            })
            .eq(
              "id",
              recipient.id
            );

          if (recipientUpdateError) {
            throw new Error(
              recipientUpdateError.message
            );
          }

          campaignSent += 1;
          sent += 1;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "WhatsApp delivery failed.";

          console.error(
            "[CAMPAIGN WHATSAPP ERROR]",
            errorMessage
          );

          await supabase
            .from(
              "campaign_recipients"
            )
            .update({
              status: "failed",
              error_message:
                errorMessage,
            })
            .eq(
              "id",
              recipient.id
            );

          campaignFailed += 1;
          failed += 1;
        }
      }

      const {
        count: remainingCount,
        error: remainingError,
      } = await supabase
        .from(
          "campaign_recipients"
        )
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "campaign_id",
          campaign.id
        )
        .in("status", [
          "queued",
          "sending",
        ]);

      if (remainingError) {
        throw new Error(
          remainingError.message
        );
      }

      if (
        (remainingCount || 0) === 0 &&
        campaignFailed === 0 &&
        campaignSkipped === 0
      ) {
        const {
          error: campaignUpdateError,
        } = await supabase
          .from("campaigns")
          .update({
            status: "sent",
            sent_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            campaign.id
          )
          .eq(
            "restaurant_id",
            restaurant.id
          );

        if (campaignUpdateError) {
          throw new Error(
            campaignUpdateError.message
          );
        }
      }

      campaignsProcessed += 1;

      campaignResults.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        sent: campaignSent,
        failed: campaignFailed,
        skipped: campaignSkipped,
      });
    }

    return NextResponse.json({
      ok: true,
      status: "PROCESSED",
      campaignsProcessed,
      recipientsProcessed,
      sent,
      failed,
      skipped,
      campaigns: campaignResults,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Campaign execution failed.";

    console.error(
      "[CAMPAIGN EXECUTION ERROR]",
      errorMessage
    );

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}



