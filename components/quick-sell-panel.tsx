"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrencyRates } from "@/components/currency-rates-provider";
import { useToast } from "@/components/ui/toast";
import { BARCODE_COPIED_EVENT } from "@/components/ui/copy-barcode-button";

const scanAnimation = `
  @keyframes scan {
    0%, 100% {
      opacity: 0.4;
      filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.3));
    }
    50% {
      opacity: 1;
      filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));
    }
  }
  .animate-scan {
    animation: scan 1.2s ease-in-out infinite;
    color: #3b82f6;
  }
`;

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

type QuickSellFixResponse = {
  success?: boolean;
  quantity?: number;
  error?: string;
};

type ScannedQuickSellItem = QuickSellItem & {
  sellQuantity: number;
};

const makeItemKey = (item: { tableKey: string; id: number }) => `${item.tableKey}:${item.id}`;
const KDV_RATE = 0.16;
const PERVANAH_DISCOUNT_RATE = 0.1;
const QUICK_SELL_STORAGE_KEY = "quick_sell_checkout_state";

const focusScannerInput = (input: HTMLInputElement | null) => {
  if (!input) return;
  input.focus({ preventScroll: true });
};

export function QuickSellPanel() {
  const [applyPervanahDiscount, setApplyPervanahDiscount] = useState(false);
  const [code, setCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedQuickSellItem[]>([]);
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);
  const [hasLoadedStoredState, setHasLoadedStoredState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<number | null>(null);
  const [isPrintingInvoice, setIsPrintingInvoice] = useState(false);
  const [isUndoingInvoice, setIsUndoingInvoice] = useState(false);
  const [fixingItemKey, setFixingItemKey] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const latestRequestTokenRef = useRef(0);
  const lastLookupRef = useRef("");
  const { showToast } = useToast();
  const { formatFromUSD, formatMultiFromUSD, isLoadingRates } = useCurrencyRates();

  const activeItem = useMemo(
    () =>
      scannedItems.find((item) => makeItemKey(item) === activeItemKey) ??
      scannedItems[0] ??
      null,
    [activeItemKey, scannedItems]
  );

  const isAvailable = useMemo(() => (activeItem?.quantity ?? 0) > 0, [activeItem?.quantity]);
  const subtotal = useMemo(
    () =>
      scannedItems.reduce((sum, item) => {
        const unitPrice = Number(item.price) || 0;
        return sum + unitPrice * item.sellQuantity;
      }, 0),
    [scannedItems]
  );
  const discountedSubtotal = useMemo(() => {
    if (!applyPervanahDiscount) return subtotal;
    return subtotal * (1 - PERVANAH_DISCOUNT_RATE);
  }, [applyPervanahDiscount, subtotal]);
  const kdvAmount = useMemo(() => subtotal * KDV_RATE, [subtotal]);
  const grandTotal = useMemo(() => subtotal + kdvAmount, [subtotal, kdvAmount]);
  const discountedGrandTotal = useMemo(() => {
    if (!applyPervanahDiscount) return grandTotal;
    return grandTotal * (1 - PERVANAH_DISCOUNT_RATE);
  }, [applyPervanahDiscount, grandTotal]);
  const hasInvalidSellQuantity = useMemo(
    () =>
      scannedItems.some(
        (item) => item.sellQuantity < 1 || item.sellQuantity > Math.max(0, item.quantity ?? 0)
      ),
    [scannedItems]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUICK_SELL_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as
        | {
            items?: ScannedQuickSellItem[];
            activeItemKey?: string | null;
          }
        | null;

      const items = Array.isArray(parsed?.items)
        ? parsed.items.filter(
            (item) =>
              item &&
              typeof item.tableKey === "string" &&
              Number.isFinite(Number(item.id)) &&
              typeof item.title === "string" &&
              Number.isFinite(Number(item.sellQuantity))
          )
        : [];

      if (!items.length) return;

      setScannedItems(items);
      const loadedActiveKey = parsed?.activeItemKey ?? null;
      const hasLoadedKey = !!loadedActiveKey && items.some((item) => makeItemKey(item) === loadedActiveKey);
      setActiveItemKey(hasLoadedKey ? loadedActiveKey : makeItemKey(items[0]));
    } catch (storageError) {
      console.error("[quick-sell] failed to load persisted checkout list:", storageError);
    } finally {
      setHasLoadedStoredState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredState) return;
    try {
      if (scannedItems.length === 0) {
        localStorage.removeItem(QUICK_SELL_STORAGE_KEY);
        return;
      }

      localStorage.setItem(
        QUICK_SELL_STORAGE_KEY,
        JSON.stringify({
          items: scannedItems,
          activeItemKey,
        })
      );
    } catch (storageError) {
      console.error("[quick-sell] failed to persist checkout list:", storageError);
    }
  }, [activeItemKey, hasLoadedStoredState, scannedItems]);

  useEffect(() => {
    if (scannedItems.length === 0) {
      if (activeItemKey !== null) {
        setActiveItemKey(null);
      }
      return;
    }

    if (!activeItemKey || !scannedItems.some((item) => makeItemKey(item) === activeItemKey)) {
      setActiveItemKey(makeItemKey(scannedItems[0]));
    }
  }, [activeItemKey, scannedItems]);

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

      setLastInvoiceId(null);
      setActiveItemKey(incomingKey);
      setCode("");
      focusScannerInput(inputRef.current);
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
    focusScannerInput(inputRef.current);

    const handleWindowFocus = () => {
      if (!document.hidden) focusScannerInput(inputRef.current);
    };

    window.addEventListener("focus", handleWindowFocus);

    const handleBarcodeCopy = (event: Event) => {
      const custom = event as CustomEvent<string>;
      const copiedBarcode = custom.detail?.trim();
      if (!copiedBarcode) return;
      setCode(copiedBarcode);
    };
    window.addEventListener(BARCODE_COPIED_EVENT, handleBarcodeCopy as EventListener);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener(BARCODE_COPIED_EVENT, handleBarcodeCopy as EventListener);
      if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
      if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);
      if (requestControllerRef.current) requestControllerRef.current.abort();
    };
  }, []);

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

      setLastInvoiceId(data.invoiceId);
      setScannedItems([]);
      setActiveItemKey(null);
      setError(null);
      setCode("");
      focusScannerInput(inputRef.current);
      showToast("Checkout completed", "success");
    } catch (sellError) {
      const message = sellError instanceof Error ? sellError.message : "Sell failed";
      showToast(message, "error");
    } finally {
      setIsSelling(false);
    }
  };

  const handleFixZeroQuantity = async (item: ScannedQuickSellItem) => {
    const itemKey = makeItemKey(item);
    if (item.quantity > 0 || fixingItemKey === itemKey) return;

    setFixingItemKey(itemKey);
    try {
      const response = await fetch("/api/quick-sell", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableKey: item.tableKey,
          productId: item.id,
        }),
      });

      const data = (await response.json().catch(() => null)) as QuickSellFixResponse | null;

      if (!response.ok || !data?.success || !Number.isFinite(Number(data.quantity))) {
        throw new Error(data?.error ?? "Failed to fix stock");
      }

      const fixedQuantity = Math.max(0, Number(data.quantity));
      setScannedItems((current) =>
        current.map((entry) =>
          makeItemKey(entry) === itemKey
            ? {
                ...entry,
                quantity: fixedQuantity,
                sellQuantity: Math.max(1, Math.min(entry.sellQuantity, fixedQuantity || 1)),
              }
            : entry
        )
      );
      showToast(`Stock fixed for ${item.title}`, "success");
    } catch (fixError) {
      const message = fixError instanceof Error ? fixError.message : "Failed to fix stock";
      showToast(message, "error");
    } finally {
      setFixingItemKey(null);
    }
  };

  const handlePrintInvoice = (invoiceId: number) => {
    if (isPrintingInvoice) return;

    setIsPrintingInvoice(true);
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.setAttribute("aria-hidden", "true");
    frame.src = `/invoices/${invoiceId}`;
    document.body.appendChild(frame);

    const cleanup = () => {
      frame.remove();
      setIsPrintingInvoice(false);
    };

    const startedAt = Date.now();
    const maxWaitMs = 15000;

    const tryPrint = () => {
      const frameWindow = frame.contentWindow;
      const frameDoc = frame.contentDocument;
      const hasInvoice = !!frameDoc?.querySelector(".invoice-container");

      if (frameWindow && hasInvoice) {
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(cleanup, 800);
        return;
      }

      if (Date.now() - startedAt > maxWaitMs) {
        cleanup();
        showToast("Could not load invoice for printing", "error");
        return;
      }

      window.setTimeout(tryPrint, 250);
    };

    frame.onload = () => {
      window.setTimeout(tryPrint, 250);
    };
  };

  const handleUndoInvoice = async (invoiceId: number) => {
    if (isUndoingInvoice) return;

    setIsUndoingInvoice(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/undo`, {
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; errorCode?: string }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Undo failed");
      }

      setLastInvoiceId(null);
      showToast("Invoice undone", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Undo failed";
      showToast(message, "error");
    } finally {
      setIsUndoingInvoice(false);
    }
  };

  return (
    <>
      <style>{scanAnimation}</style>
      <aside className="w-full rounded-2xl border border-border/60 bg-card/70 p-4 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-foreground">checkout</p>
          <button
            type="button"
            onClick={() => setApplyPervanahDiscount((current) => !current)}
            className="text-sm font-semibold text-blue-600 underline underline-offset-4 dark:text-blue-400"
          >
            {applyPervanahDiscount ? "Pervanah off" : "Pervanah -10%"}
          </button>
        </div>

      <input
        ref={inputRef}
        autoFocus
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
              focusScannerInput(inputRef.current);
            }
          }, 0);
        }}
        placeholder="Scan QR/Barcode"
        className={showManualInput ? "mt-4 w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm outline-none ring-0 transition focus:border-foreground/40" : "absolute -inset-full opacity-0 pointer-events-none"}
      />

      <div className="mt-4 min-h-96 flex flex-col">
        {isSearching ? (
          <div className="flex items-center justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}

        {scannedItems.length === 0 && !isSearching && !error && (
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mt-auto pt-4 border-t border-border/60">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 animate-scan" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M7 10h10" />
                  <path d="M7 14h6" />
                </svg>
              </span>
              <p>ready when you are</p>
            </div>
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="h-9 w-9 rounded-lg border border-border/60 bg-primary/10 text-primary transition hover:bg-primary/20 flex items-center justify-center"
              aria-label="Manual input"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        )}

        {scannedItems.length > 0 && (
          <div className="pt-4 space-y-2 flex flex-col h-full">
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {scannedItems.map((item) => {
                const itemKey = makeItemKey(item);
                const itemTotal = (Number(item.price) || 0) * item.sellQuantity;

                return (
                  <div
                    key={itemKey}
                    className="flex items-center justify-between gap-2 px-2 py-2 text-xs text-foreground hover:bg-muted/40 rounded transition"
                  >
                    <div className="flex-1 min-w-0 truncate">
                      <p className="text-sm font-semibold truncate">
                        {item.sellQuantity > 1 && <span className="text-muted-foreground">{item.sellQuantity}+ </span>}
                        {item.title}
                      </p>
                    </div>

                    <div className="shrink-0 min-w-24 text-right">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatFromUSD(itemTotal, "USD")}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const converted = formatMultiFromUSD(itemTotal);
                          return `${converted.TRY} • ${converted.EUR} • ${converted.GBP}`;
                        })()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.quantity <= 0 && (
                        <button
                          type="button"
                          onClick={() => void handleFixZeroQuantity(item)}
                          disabled={isSelling || fixingItemKey === itemKey}
                          className="h-7 rounded border border-amber-500/60 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {fixingItemKey === itemKey ? "Fixing..." : "Fix"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setScannedItems((current) => current.filter((entry) => makeItemKey(entry) !== itemKey));
                          setActiveItemKey((current) => (current === itemKey ? null : current));
                        }}
                        className="h-7 w-7 rounded transition hover:opacity-80 flex items-center justify-center shrink-0"
                        aria-label="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" className="h-5 w-5">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto space-y-3 pt-3 border-t border-border/60">
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatFromUSD(discountedSubtotal, "USD")}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>KDV ({Math.round(KDV_RATE * 100)}%)</span>
                  <span className="font-medium">{formatFromUSD(kdvAmount, "USD")}</span>
                </div>
                {applyPervanahDiscount ? (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Pervanah</span>
                    <span className="font-medium">-10%</span>
                  </div>
                ) : null}
                <div className="flex items-start justify-between text-base font-bold text-foreground">
                  <span>Total</span>
                  <div className="mt-1 text-right">
                    <span>{formatFromUSD(discountedGrandTotal, "USD")} (card)</span>
                    <p>
                      {formatFromUSD(discountedSubtotal, "USD")} (cash)
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {(() => {
                        const converted = formatMultiFromUSD(discountedGrandTotal);
                        return `${converted.TRY} • ${converted.EUR} • ${converted.GBP} (card)`;
                      })()}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {(() => {
                        const converted = formatMultiFromUSD(discountedSubtotal);
                        return `${converted.TRY} • ${converted.EUR} • ${converted.GBP} (cash)`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
              {isLoadingRates && (
                <p className="text-sm text-muted-foreground">Loading live TRY/EUR/GBP rates...</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScannedItems([]);
                    setActiveItemKey(null);
                    setError(null);
                    setCode("");
                    setLastInvoiceId(null);
                    focusScannerInput(inputRef.current);
                  }}
                  disabled={isSelling || scannedItems.length === 0}
                  className="h-10 rounded-xl border border-border/60 bg-background text-sm font-semibold text-foreground transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleSell()}
                  disabled={
                    scannedItems.length === 0 ||
                    isSelling ||
                    !isAvailable ||
                    hasInvalidSellQuantity
                  }
                  className="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSelling ? "Processing..." : "Checkout"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {lastInvoiceId && (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-sm font-semibold text-emerald-700">Checkout completed.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePrintInvoice(lastInvoiceId)}
              disabled={isPrintingInvoice || isUndoingInvoice}
              className="h-9 rounded-lg border border-emerald-600/30 bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPrintingInvoice ? "Opening printer..." : "Print invoice"}
            </button>
            <button
              type="button"
              onClick={() => void handleUndoInvoice(lastInvoiceId)}
              disabled={isUndoingInvoice || isPrintingInvoice}
              className="h-9 rounded-lg border border-red-500/40 bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUndoingInvoice ? "Undoing..." : "Undo invoice"}
            </button>
          </div>
        </div>
      )}

      </aside>
    </>
  );
}
