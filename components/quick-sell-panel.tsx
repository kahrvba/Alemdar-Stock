"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";

type QuickSellItem = {
  tableKey: string;
  section: string;
  id: number;
  title: string;
  price: string | null;
  quantity: number;
};

type QuickSellResolveResponse = {
  found?: boolean;
  item?: QuickSellItem;
  error?: string;
};

type ScannedQuickSellItem = QuickSellItem & {
  sellQuantity: number;
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

const makeItemKey = (item: { tableKey: string; id: number }) => `${item.tableKey}:${item.id}`;

export function QuickSellPanel() {
  const [code, setCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedQuickSellItem[]>([]);
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const latestRequestTokenRef = useRef(0);
  const lastLookupRef = useRef("");
  const { showToast } = useToast();

  const activeItem = useMemo(
    () =>
      scannedItems.find((item) => makeItemKey(item) === activeItemKey) ??
      scannedItems[0] ??
      null,
    [activeItemKey, scannedItems]
  );

  const isAvailable = useMemo(() => (activeItem?.quantity ?? 0) > 0, [activeItem?.quantity]);
  const hasInvalidSellQuantity = useMemo(
    () =>
      scannedItems.some(
        (item) => item.sellQuantity < 1 || item.sellQuantity > Math.max(0, item.quantity ?? 0)
      ),
    [scannedItems]
  );

  const lookupProduct = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    lastLookupRef.current = trimmed;
    latestRequestTokenRef.current += 1;
    const requestToken = latestRequestTokenRef.current;

    if (requestControllerRef.current) {
      requestControllerRef.current.abort();
    }
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/quick-sell?code=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (requestToken !== latestRequestTokenRef.current) return;

      if (!response.ok) {
        const fail = (await response.json().catch(() => null)) as QuickSellResolveResponse | null;
        throw new Error(fail?.error ?? "Product not available");
      }

      const data = (await response.json()) as QuickSellResolveResponse;
      const resolvedItem = data.item;
      if (!data.found || !resolvedItem) {
        setError("Product not available");
        return;
      }

      const incomingKey = makeItemKey(resolvedItem);
      const existing = scannedItems.find((item) => makeItemKey(item) === incomingKey);
      const maxAllowed = Math.max(1, resolvedItem.quantity ?? 0);
      const requestedQuantity = (existing?.sellQuantity ?? 0) + 1;
      const shouldShowOverLimitToast = requestedQuantity > maxAllowed && !!existing;

      setScannedItems((current) => {
        const existingIndex = current.findIndex((item) => makeItemKey(item) === incomingKey);

        if (existingIndex === -1) {
          return [...current, { ...resolvedItem, sellQuantity: 1 }];
        }

        const existing = current[existingIndex];
        const maxAllowed = Math.max(1, resolvedItem.quantity ?? 0);
        const requestedQuantity = existing.sellQuantity + 1;
        const nextQuantity = Math.min(maxAllowed, requestedQuantity);
        const updated: ScannedQuickSellItem = {
          ...existing,
          ...resolvedItem,
          sellQuantity: nextQuantity,
        };

        const next = [...current];
        next[existingIndex] = updated;
        return next;
      });
      if (shouldShowOverLimitToast) {
        showToast("stock finished", "error");
      }

      setActiveItemKey(incomingKey);
      setCode("");
      inputRef.current?.focus();
    } catch (lookupError) {
      if (controller.signal.aborted) return;
      if (requestToken !== latestRequestTokenRef.current) return;
      const message =
        lookupError instanceof Error ? lookupError.message : "Product not available";
      setError(message);
    } finally {
      if (requestToken === latestRequestTokenRef.current) {
        setIsSearching(false);
      }
    }
  };

  useEffect(() => {
    const trimmed = code.trim();

    if (!trimmed) {
      setError(null);
      setIsSearching(false);
      lastLookupRef.current = "";
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }

    if (trimmed === lastLookupRef.current) return;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void lookupProduct(trimmed);
    }, 120);
  }, [code]);

  useEffect(() => {
    if (isInputOpen) {
      inputRef.current?.focus();
    }

    const handleWindowFocus = () => {
      if (!document.hidden && isInputOpen) inputRef.current?.focus();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
      if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);
      if (requestControllerRef.current) requestControllerRef.current.abort();
    };
  }, [isInputOpen]);

  const updateActiveSellQuantity = (direction: "inc" | "dec") => {
    if (!activeItem) return;
    if (direction === "inc" && activeItem.sellQuantity >= Math.max(0, activeItem.quantity ?? 0)) {
      showToast("stock finished", "error");
      return;
    }

    setScannedItems((current) =>
      current.map((item) => {
        if (makeItemKey(item) !== makeItemKey(activeItem)) return item;

        if (direction === "dec") {
          return { ...item, sellQuantity: Math.max(1, item.sellQuantity - 1) };
        }

        return {
          ...item,
          sellQuantity: Math.min(Math.max(1, item.quantity ?? 1), item.sellQuantity + 1),
        };
      })
    );
  };

  const handleSell = async () => {
    if (scannedItems.length === 0) return;
    if (!activeItem) return;
    if (!isAvailable || hasInvalidSellQuantity) {
      showToast("stock finished", "error");
      return;
    }

    setIsSelling(true);
    try {
      const response = await fetch("/api/quick-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: scannedItems.map((item) => ({
            tableKey: item.tableKey,
            productId: item.id,
            quantity: item.sellQuantity,
          })),
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; invoiceId?: number; error?: string }
        | null;

      if (!response.ok || !data?.success || !data.invoiceId) {
        throw new Error(data?.error ?? "Checkout failed");
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
      <p className="text-center text-lg font-bold text-foreground">checkout</p>

      <div className="mt-4 flex gap-2">
        {!isInputOpen && (
          <button
            type="button"
            onClick={() => setIsInputOpen(true)}
            className="flex-1 h-11 rounded-xl border border-border/60 bg-primary/10 text-sm font-semibold text-primary transition hover:bg-primary/20"
          >
            Open Input
          </button>
        )}
        {isInputOpen && (
          <input
            ref={inputRef}
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onBlur={() => {
              if (blurTimerRef.current !== null) {
                window.clearTimeout(blurTimerRef.current);
              }
              blurTimerRef.current = window.setTimeout(() => {
                const active = document.activeElement;
                const userTypingElsewhere =
                  active instanceof HTMLInputElement ||
                  active instanceof HTMLTextAreaElement ||
                  active instanceof HTMLSelectElement ||
                  (active instanceof HTMLElement && active.isContentEditable);
                if (!userTypingElsewhere) {
                  inputRef.current?.focus();
                }
              }, 0);
            }}
            placeholder="Scan QR/Barcode"
            className="flex-1 h-11 rounded-xl border border-border/60 bg-background px-3 text-sm outline-none ring-0 transition focus:border-foreground/40"
          />
        )}
      </div>

      <div
        className={
          activeItem || error || isSearching
            ? "mt-4 rounded-xl border border-border/60 bg-background/60 p-3"
            : "mt-3"
        }
      >
        {isSearching ? (
          <div className="flex items-center justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : activeItem ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{activeItem.title}</p>
            <div className="flex items-center justify-between text-sm font-bold text-emerald-600">
              <span>Price: {formatPrice(activeItem.price)}</span>
              <span>{`Available: ${Math.max(0, activeItem.quantity ?? 0)}`}</span>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-xl border border-border/60 bg-card px-2 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Quantity
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateActiveSellQuantity("dec")}
                  className="h-7 w-7 rounded-md border border-border/60 text-sm font-bold text-foreground transition hover:bg-muted"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm font-bold text-foreground">
                  {activeItem.sellQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateActiveSellQuantity("inc")}
                  className="h-7 w-7 rounded-md border border-border/60 text-sm font-bold text-foreground transition hover:bg-muted"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSell()}
              disabled={
                scannedItems.length === 0 ||
                isSelling ||
                !isAvailable ||
                hasInvalidSellQuantity
              }
              className="mt-2 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSelling ? "Selling..." : "Sell All"}
            </button>

            {scannedItems.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                {scannedItems.map((item) => {
                  const itemKey = makeItemKey(item);
                  const isActive = makeItemKey(activeItem) === itemKey;

                  return (
                    <div
                      key={itemKey}
                      className={`flex items-center justify-between rounded-lg border px-2 py-2 ${
                        isActive ? "border-foreground/40 bg-card" : "border-border/60 bg-background/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveItemKey(itemKey)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs font-medium text-muted-foreground">Qty: {item.sellQuantity}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScannedItems((current) => current.filter((entry) => makeItemKey(entry) !== itemKey));
                          setActiveItemKey((current) => (current === itemKey ? null : current));
                        }}
                        className="ml-2 rounded-md border border-red-500/60 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M7 10h10" />
                <path d="M7 14h6" />
              </svg>
            </span>
            <p>ready when you are</p>
          </div>
        )}
      </div>

    </aside>
  );
}
