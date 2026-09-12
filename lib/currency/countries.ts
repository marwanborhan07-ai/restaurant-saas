export type CountryOption = {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: "EG", name: "Egypt", currency: "EGP", currencySymbol: "EGP" },

  { code: "SA", name: "Saudi Arabia", currency: "SAR", currencySymbol: "SAR" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", currencySymbol: "AED" },
  { code: "QA", name: "Qatar", currency: "QAR", currencySymbol: "QAR" },
  { code: "KW", name: "Kuwait", currency: "KWD", currencySymbol: "KWD" },
  { code: "BH", name: "Bahrain", currency: "BHD", currencySymbol: "BHD" },
  { code: "OM", name: "Oman", currency: "OMR", currencySymbol: "OMR" },

  { code: "US", name: "United States", currency: "USD", currencySymbol: "$" },
  { code: "GB", name: "United Kingdom", currency: "GBP", currencySymbol: "£" },
  { code: "DE", name: "Germany", currency: "EUR", currencySymbol: "€" },
  { code: "FR", name: "France", currency: "EUR", currencySymbol: "€" },
  { code: "IT", name: "Italy", currency: "EUR", currencySymbol: "€" },
  { code: "ES", name: "Spain", currency: "EUR", currencySymbol: "€" },

  { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "CA$" },
  { code: "AU", name: "Australia", currency: "AUD", currencySymbol: "A$" },

  { code: "IN", name: "India", currency: "INR", currencySymbol: "₹" },
  { code: "TR", name: "Turkey", currency: "TRY", currencySymbol: "₺" },
];

export function getCountry(code: string) {
  return COUNTRIES.find((country) => country.code === code);
}

export function getCurrencyInfo(currency: string) {
  return COUNTRIES.find((country) => country.currency === currency);
}
