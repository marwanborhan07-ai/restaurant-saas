import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type RequestBody = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore cookie write errors in route handler.
          }
        },
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabase();

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
      ? new Date(restaurant.trial_ends_at).getTime()
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
      (await request.json()) as RequestBody;

    const accessToken =
      body.accessToken?.trim();

    const phoneNumberId =
      body.phoneNumberId?.trim();

    const apiVersion =
      body.apiVersion?.trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp access token is required.",
        },
        { status: 400 }
      );
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp phone number ID is required.",
        },
        { status: 400 }
      );
    }

    if (!apiVersion) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp API version is required.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error?.message ||
            "WhatsApp connection failed.",
        },
        {
          status:
            response.status || 400,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "WhatsApp connection verified.",
      data: {
        id: data?.id || phoneNumberId,
        display_phone_number:
          data?.display_phone_number ||
          null,
        verified_name:
          data?.verified_name ||
          data?.name ||
          null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
