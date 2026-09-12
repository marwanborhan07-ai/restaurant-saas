import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { PLANS, type PlanKey } from "@/lib/subscription";

type PaymentMethod =
  | "instapay"
  | "orange_cash"
  | "we_pay";

export async function POST(request: Request) {
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

    const plan = String(body.plan || "") as PlanKey;

    const paymentMethod =
      String(body.paymentMethod || "") as PaymentMethod;

    const transactionReference =
      String(
        body.transactionReference || ""
      ).trim();

    const proofPath =
      String(body.proofPath || "").trim();

    if (!PLANS[plan]) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    if (
      ![
        "instapay",
        "orange_cash",
        "we_pay",
      ].includes(paymentMethod)
    ) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    if (!transactionReference) {
      return NextResponse.json(
        {
          error:
            "Transaction reference is required",
        },
        { status: 400 }
      );
    }

    if (!proofPath) {
      return NextResponse.json(
        {
          error:
            "Payment proof is required",
        },
        { status: 400 }
      );
    }

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select(
        "id,currency_code,plan,subscription_status,trial_ends_at"
      )
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

    const currencyCode =
      restaurant.currency_code || "EGP";

    if (currencyCode !== "EGP") {
      return NextResponse.json(
        {
          error:
            "Foreign-currency checkout is not enabled for manual payments yet.",
        },
        { status: 400 }
      );
    }

    const {
      data: pendingRequest,
      error: pendingError,
    } = await supabase
      .from("payment_requests")
      .select("id")
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pendingError) {
      return NextResponse.json(
        { error: pendingError.message },
        { status: 500 }
      );
    }

    if (pendingRequest) {
      return NextResponse.json(
        {
          error:
            "You already have a pending payment request.",
        },
        { status: 409 }
      );
    }

    const { data: priceRow, error: priceError } =
      await supabase
        .from("plan_prices")
        .select(
          "plan,currency_code,amount"
        )
        .eq("plan", plan)
        .eq("currency_code", currencyCode)
        .eq("enabled", true)
        .maybeSingle();

    if (priceError) {
      return NextResponse.json(
        { error: priceError.message },
        { status: 500 }
      );
    }

    if (!priceRow) {
      return NextResponse.json(
        {
          error:
            "Pricing is not configured for this currency.",
        },
        { status: 400 }
      );
    }

    const baseAmount = PLANS[plan].price;

    const localAmount =
      Number(priceRow.amount);

    const { data: insertedRequest, error: insertError } =
      await supabase
        .from("payment_requests")
        .insert({
          restaurant_id: restaurant.id,
          owner_id: user.id,
          plan,
          amount: localAmount,
          currency_code: currencyCode,
          exchange_rate:
            currencyCode === "EGP"
              ? 1
              : null,
          base_amount: baseAmount,
          payment_method: paymentMethod,
          transaction_reference:
            transactionReference,
          proof_path: proofPath,
          status: "pending",
          updated_at:
            new Date().toISOString(),
        })
        .select(
          "id,plan,amount,currency_code,exchange_rate,base_amount,status"
        )
        .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: insertedRequest,
    });
  } catch (error) {
    console.error(
      "Create payment request error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
