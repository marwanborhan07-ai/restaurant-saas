export type SupportedCurrency =
  | "EGP"
  | "SAR"
  | "AED"
  | "QAR"
  | "KWD"
  | "BHD"
  | "OMR"
  | "USD"
  | "GBP"
  | "EUR"
  | "CAD"
  | "AUD"
  | "INR"
  | "TRY";

export function convertFromEGP(
  egpAmount: number,
  exchangeRate: number
) {
  return egpAmount * exchangeRate;
}

export function roundCurrency(
  amount: number,
  currency: string
) {
  if (currency === "KWD" || currency === "BHD" || currency === "OMR") {
    return Math.round(amount * 1000) / 1000;
  }

  return Math.round(amount * 100) / 100;
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en-US"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits:
      currency === "KWD" ||
      currency === "BHD" ||
      currency === "OMR"
        ? 3
        : 2,
  }).format(amount);
}
