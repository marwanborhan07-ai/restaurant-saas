import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const PLANS = ["launch", "growth", "scale"] as const;

export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: restaurant, error: restaurantError } =
      await supabase
        .from("restaurants")
        .select("currency_code")
        .eq("owner_id", user.id)
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (restaurantError) {
      return NextResponse.json(
        { error: restaurantError.message },
        { status: 500 }
      );
    }

    const currencyCode =
      restaurant?.currency_code || "EGP";

    const { data: rows, error: priceError } =
      await supabase
        .from("plan_prices")
        .select("plan,currency_code,amount")
        .eq("currency_code", currencyCode)
        .eq("enabled", true);

    if (priceError) {
      return NextResponse.json(
        { error: priceError.message },
        { status: 500 }
      );
    }

    const prices: Record<
      (typeof PLANS)[number],
      number
    > = {
      launch: 0,
      growth: 0,
      scale: 0,
    };

    for (const row of rows || []) {
      if (
        PLANS.includes(
          row.plan as (typeof PLANS)[number]
        )
      ) {
        prices[
          row.plan as (typeof PLANS)[number]
        ] = Number(row.amount);
      }
    }

    return NextResponse.json({
      success: true,
      currencyCode,
      prices,
    });
  } catch (error) {
    console.error(
      "Billing prices error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
