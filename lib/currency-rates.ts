export const CHECKOUT_CURRENCIES = ["USD", "TRY", "EUR", "GBP"] as const;

export type CheckoutCurrencyCode = (typeof CHECKOUT_CURRENCIES)[number];

export type CheckoutCurrencyRates = Record<CheckoutCurrencyCode, number>;

export const FALLBACK_CURRENCY_RATES: CheckoutCurrencyRates = {
  USD: 1,
  TRY: 1,
  EUR: 1,
  GBP: 1,
};

// North Cyprus local market spread over public FX feeds (Frankfurter).
// Example calibration: 260.57 -> 272.61 for 5.80 USD.
export const NORTH_CYPRUS_TRY_MARGIN_MULTIPLIER = 1.046206;

export function normalizeCurrencyRates(
  input?: Partial<Record<CheckoutCurrencyCode, number>> | null
): CheckoutCurrencyRates {
  return {
    USD: 1,
    TRY:
      typeof input?.TRY === "number" && Number.isFinite(input.TRY) && input.TRY > 0
        ? input.TRY
        : FALLBACK_CURRENCY_RATES.TRY,
    EUR:
      typeof input?.EUR === "number" && Number.isFinite(input.EUR) && input.EUR > 0
        ? input.EUR
        : FALLBACK_CURRENCY_RATES.EUR,
    GBP:
      typeof input?.GBP === "number" && Number.isFinite(input.GBP) && input.GBP > 0
        ? input.GBP
        : FALLBACK_CURRENCY_RATES.GBP,
  };
}

export function applyNorthCyprusTryMargin(
  rates: CheckoutCurrencyRates
): CheckoutCurrencyRates {
  return {
    ...rates,
    TRY: rates.TRY * NORTH_CYPRUS_TRY_MARGIN_MULTIPLIER,
  };
}

export function convertFromUSD(
  value: number | string | null | undefined,
  rates: CheckoutCurrencyRates,
  currency: CheckoutCurrencyCode
): number {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return numeric * (rates[currency] ?? 1);
}

export function formatCurrency(
  value: number,
  currency: CheckoutCurrencyCode
): string {
  const locale = currency === "TRY" ? "tr-TR" : undefined;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatFromUSD(
  value: number | string | null | undefined,
  rates: CheckoutCurrencyRates,
  currency: CheckoutCurrencyCode
): string {
  return formatCurrency(convertFromUSD(value, rates, currency), currency);
}

export function formatMultiFromUSD(
  value: number | string | null | undefined,
  rates: CheckoutCurrencyRates
): Record<CheckoutCurrencyCode, string> {
  return {
    USD: formatFromUSD(value, rates, "USD"),
    TRY: formatFromUSD(value, rates, "TRY"),
    EUR: formatFromUSD(value, rates, "EUR"),
    GBP: formatFromUSD(value, rates, "GBP"),
  };
}
