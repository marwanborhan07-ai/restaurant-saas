import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
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

    const body = await request.json();

    const countryCode = String(
      body.countryCode || ""
    )
      .trim()
      .toUpperCase();

    const currencyCode = String(
      body.currencyCode || ""
    )
      .trim()
      .toUpperCase();

    if (!countryCode || !currencyCode) {
      return NextResponse.json(
        {
          error:
            "Country and currency are required",
        },
        { status: 400 }
      );
    }

    const { data: restaurant, error: restaurantError } =
      await supabase
        .from("restaurants")
        .select("id")
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

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { error: updateError } =
      await supabase
        .from("restaurants")
        .update({
          country_code: countryCode,
          currency_code: currencyCode,
        })
        .eq("id", restaurant.id)
        .eq("owner_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      countryCode,
      currencyCode,
    });
  } catch (error) {
    console.error(
      "Account location update error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
