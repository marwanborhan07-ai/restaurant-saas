import { NextResponse } from "next/server";

const SUPPORTED_CURRENCIES = [
  "EGP",
  "SAR",
  "AED",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "USD",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
  "INR",
  "TRY",
];

export async function GET() {
  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/EGP",
      {
        next: {
          revalidate: 3600,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }

    const data = await response.json();

    if (data?.result !== "success" || !data?.rates) {
      throw new Error("Invalid exchange rate response");
    }

    const rates: Record<string, number> = {
      EGP: 1,
    };

    for (const currency of SUPPORTED_CURRENCIES) {
      const rate = Number(data.rates[currency]);

      if (currency === "EGP") {
        rates[currency] = 1;
      } else if (Number.isFinite(rate) && rate > 0) {
        rates[currency] = rate;
      }
    }

    return NextResponse.json({
      success: true,
      base: "EGP",
      rates,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Currency rates error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load exchange rates",
      },
      { status: 503 }
    );
  }
}
