import { NextResponse } from "next/server";
import { applyNorthCyprusTryMargin, normalizeCurrencyRates } from "@/lib/currency-rates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const response = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,EUR,GBP",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Rate fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      rates?: Partial<Record<"TRY" | "EUR" | "GBP", number>>;
      date?: string;
    };

    const normalizedRates = normalizeCurrencyRates({
      TRY: data.rates?.TRY,
      EUR: data.rates?.EUR,
      GBP: data.rates?.GBP,
    });
    const rates = applyNorthCyprusTryMargin(normalizedRates);

    return NextResponse.json(
      {
        success: true,
        base: "USD",
        rates,
        date: data.date ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[currency-rates] failed:", error);
    const rates = applyNorthCyprusTryMargin(normalizeCurrencyRates(null));
    return NextResponse.json(
      {
        success: true,
        base: "USD",
        rates,
        fallback: true,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
}
