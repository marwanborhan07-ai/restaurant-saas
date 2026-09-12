import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type ConnectBody = {
  code: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
};

function getSupabaseServerClient(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  return { supabase, response };
}

export async function POST(request: NextRequest) {
  try {
    const {
      supabase,
      response: supabaseResponse,
    } = getSupabaseServerClient(request);

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

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select(
        "id, plan, subscription_status, trial_ends_at"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
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
      paidPlans.has(restaurant.plan || "") &&
      restaurant.subscription_status === "active";

    const trialEndsAt = restaurant.trial_ends_at
      ? new Date(
          restaurant.trial_ends_at
        ).getTime()
      : 0;

    const trialIsActive =
      trialEndsAt > Date.now() &&
      (restaurant.plan === "trial" ||
        restaurant.subscription_status === "trial");

    if (!hasActivePaidPlan && !trialIsActive) {
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

    const body =
      (await request.json()) as ConnectBody;

    if (
      !body.code ||
      !body.wabaId ||
      !body.phoneNumberId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing WhatsApp authorization data.",
          code: "MISSING_AUTH_DATA",
        },
        { status: 400 }
      );
    }

    const appId =
      process.env.NEXT_PUBLIC_META_APP_ID;

    const appSecret =
      process.env.META_APP_SECRET;

    const graphVersion =
      process.env.WHATSAPP_GRAPH_API_VERSION ||
      "v25.0";

    if (!appId || !appSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meta server configuration is incomplete.",
          code: "META_CONFIG_MISSING",
        },
        { status: 500 }
      );
    }

    const exchangeUrl =
      `https://graph.facebook.com/${graphVersion}/oauth/access_token` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&code=${encodeURIComponent(body.code)}`;

    const exchangeResponse =
      await fetch(exchangeUrl, {
        method: "GET",
        cache: "no-store",
      });

    const exchangeData =
      await exchangeResponse.json();

    if (
      !exchangeResponse.ok ||
      !exchangeData.access_token
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            exchangeData.error?.message ||
            "Meta authorization code exchange failed.",
          code: "META_CODE_EXCHANGE_FAILED",
        },
        { status: 400 }
      );
    }

    const accessToken =
      exchangeData.access_token as string;

    const expiresIn =
      typeof exchangeData.expires_in === "number"
        ? exchangeData.expires_in
        : 60 * 24 * 60 * 60;

    const tokenExpiresAt = new Date(
      Date.now() + expiresIn * 1000
    ).toISOString();

    const subscribeResponse =
      await fetch(
        `https://graph.facebook.com/${graphVersion}/subscribed_apps`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

    const subscribeData =
      await subscribeResponse.json();

    if (!subscribeResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            subscribeData.error?.message ||
            "WhatsApp webhook subscription failed.",
          code: "WEBHOOK_SUBSCRIPTION_FAILED",
        },
        { status: 400 }
      );
    }

    const { error: saveError } =
      await supabase
        .from("whatsapp_connections")
        .upsert(
          {
            restaurant_id: restaurant.id,
            waba_id: body.wabaId,
            phone_number_id: body.phoneNumberId,
            access_token: accessToken,
            token_expires_at: tokenExpiresAt,
            display_phone_number:
              body.displayPhoneNumber || null,
            verified_name:
              body.verifiedName || null,
            status: "connected",
          },
          {
            onConflict: "restaurant_id",
          }
        );

    if (saveError) {
      return NextResponse.json(
        {
          success: false,
          error: saveError.message,
          code: "CONNECTION_SAVE_FAILED",
        },
        { status: 500 }
      );
    }

    supabaseResponse.headers.set(
      "Cache-Control",
      "no-store"
    );

    return NextResponse.json({
      success: true,
      wabaId: body.wabaId,
      phoneNumberId: body.phoneNumberId,
      tokenExpiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "WhatsApp connection failed.",
      },
      { status: 500 }
    );
  }
}
