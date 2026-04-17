"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";

type UniversalSearchItem = {
  tableKey: string;
  section: string;
  id: number;
  title: string;
  subtitle: string | null;
  price: string | null;
  quantity: number;
};

type UniversalSearchResponse = {
  items?: UniversalSearchItem[];
};

const formatPrice = (value: string | null) => {
  if (!value) return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
};

export function QuickSellPanel() {
  const [code, setCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [result, setResult] = useState<UniversalSearchItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastLookupRef = useRef("");
  const { showToast } = useToast();

  const isAvailable = useMemo(() => (result?.quantity ?? 0) > 0, [result?.quantity]);

  const lookupProduct = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;
    lastLookupRef.current = trimmed;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/universal-search?query=${encodeURIComponent(trimmed)}&limit=20&perSectionLimit=10`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Lookup failed");
      }

      const data = (await response.json()) as UniversalSearchResponse;
      const first = Array.isArray(data.items) ? data.items[0] : null;
      if (!first) {
        setError("Product not available");
        return;
      }

      setResult(first);
    } catch (lookupError) {
      const message =
        lookupError instanceof Error ? lookupError.message : "Lookup failed";
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed || trimmed === lastLookupRef.current) return;

    const timer = window.setTimeout(() => {
      void lookupProduct(trimmed);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [code]);

  const handleSell = async () => {
    if (!result) return;
    if (!isAvailable) {
      showToast("Product not available in stock", "error");
      return;
    }

    setIsSelling(true);
    try {
      const response = await fetch("/api/quick-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableKey: result.tableKey,
          productId: result.id,
          quantity: 1,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; invoiceId?: number; error?: string; available?: number }
        | null;

      if (!response.ok || !data?.success || !data.invoiceId) {
        const apiError = data?.error ?? "Checkout failed";
        throw new Error(apiError);
      }

      showToast("Sold successfully", "success");
      window.location.href = `/invoices/${data.invoiceId}`;
    } catch (sellError) {
      const message = sellError instanceof Error ? sellError.message : "Sell failed";
      showToast(message, "error");
    } finally {
      setIsSelling(false);
    }
  };

  return (
    <aside className="w-full rounded-2xl border border-border/60 bg-card/70 p-4 lg:sticky lg:top-20">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        QR Quick Sell
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Scan code, confirm availability, then sell instantly.
      </p>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void lookupProduct(code);
        }}
      >
        <input
          ref={inputRef}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Scan QR/Barcode"
          className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none ring-0 transition focus:border-foreground/40"
        />
        <button
          type="submit"
          disabled={isSearching || !code.trim()}
          className="mt-3 h-10 w-full rounded-xl border border-border/60 bg-muted/70 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSearching ? "Checking..." : "Check Product"}
        </button>
      </form>

      <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-3">
        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : result ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{result.title}</p>
            <p className="text-xs text-muted-foreground">
              {result.section} • ID {result.id}
            </p>
            <p className="text-xs text-muted-foreground">
              Price: {formatPrice(result.price)}
            </p>
            <p
              className={`text-sm font-semibold ${
                isAvailable ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {isAvailable ? `Available (${result.quantity})` : "Not Available"}
            </p>
            <button
              type="button"
              onClick={() => void handleSell()}
              disabled={!isAvailable || isSelling}
              className="mt-2 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSelling ? "Selling..." : "Sell"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No product scanned yet.</p>
        )}
      </div>
    </aside>
  );
}
