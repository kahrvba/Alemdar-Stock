"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  FALLBACK_CURRENCY_RATES,
  formatFromUSD,
  formatMultiFromUSD,
  normalizeCurrencyRates,
  type CheckoutCurrencyCode,
  type CheckoutCurrencyRates,
} from "@/lib/currency-rates";

const RATES_STORAGE_KEY = "checkoutCurrencyRates";

type CurrencyRatesContextValue = {
  rates: CheckoutCurrencyRates;
  isLoadingRates: boolean;
  formatFromUSD: (value: number | string | null | undefined, currency?: CheckoutCurrencyCode) => string;
  formatMultiFromUSD: (value: number | string | null | undefined) => Record<CheckoutCurrencyCode, string>;
};

const CurrencyRatesContext = createContext<CurrencyRatesContextValue | undefined>(undefined);

export function CurrencyRatesProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<CheckoutCurrencyRates>(FALLBACK_CURRENCY_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RATES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CheckoutCurrencyRates>;
        setRates(normalizeCurrencyRates(parsed));
      }
    } catch {
      // Ignore local storage failures.
    }

    const controller = new AbortController();

    async function loadRates() {
      try {
        const response = await fetch("/api/currency-rates", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch rates: ${response.status}`);
        }
        const data = (await response.json()) as { rates?: Partial<CheckoutCurrencyRates> };
        const normalized = normalizeCurrencyRates(data.rates);
        setRates(normalized);
        try {
          localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // Ignore local storage failures.
        }
      } catch {
        // Keep fallback/local rates silently.
      } finally {
        setIsLoadingRates(false);
      }
    }

    void loadRates();

    return () => {
      controller.abort();
    };
  }, []);

  const value = useMemo<CurrencyRatesContextValue>(
    () => ({
      rates,
      isLoadingRates,
      formatFromUSD: (amount, currency = "USD") => formatFromUSD(amount, rates, currency),
      formatMultiFromUSD: (amount) => formatMultiFromUSD(amount, rates),
    }),
    [isLoadingRates, rates]
  );

  return <CurrencyRatesContext.Provider value={value}>{children}</CurrencyRatesContext.Provider>;
}

export function useCurrencyRates() {
  const context = useContext(CurrencyRatesContext);
  if (!context) {
    throw new Error("useCurrencyRates must be used within CurrencyRatesProvider");
  }
  return context;
}
