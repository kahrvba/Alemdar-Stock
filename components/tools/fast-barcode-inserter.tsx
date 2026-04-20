"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

type ToolItem = {
  tableKey: string;
  section: string;
  id: number;
  title: string;
  subtitle: string | null;
  image: string | null;
  price: string | null;
  quantity: number;
  href: string;
};

export function FastBarcodeInserter() {
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [items, setItems] = useState<ToolItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [stopStream, setStopStream] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const hasScannedRef = useRef(false);
  const { showToast } = useToast();

  const extractScanText = (result: unknown) => {
    const raw = result as { text?: unknown; getText?: unknown } | null;
    if (!raw) return "";
    if (typeof raw.text === "string") return raw.text.trim();
    if (typeof raw.getText === "function") {
      try {
        const value = (raw.getText as () => unknown)();
        return typeof value === "string" ? value.trim() : "";
      } catch {
        return "";
      }
    }
    return "";
  };

  const selectedItem = useMemo(
    () => (selectedKey ? items.find((item) => `${item.tableKey}:${item.id}` === selectedKey) : null),
    [items, selectedKey]
  );

  const runSearch = async (queryValue: string) => {
    const trimmed = queryValue.trim();
    if (!trimmed) {
      setItems([]);
      setSelectedKey(null);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/universal-search?query=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );
      const data = (await response.json().catch(() => null)) as
        | { items?: ToolItem[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Search failed");
      }
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setItems(nextItems);
      setSelectedKey((current) => {
        if (current && nextItems.some((item) => `${item.tableKey}:${item.id}` === current)) {
          return current;
        }
        return null;
      });
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : "Search failed";
      setError(message);
      setItems([]);
      setSelectedKey(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      void runSearch(query);
    }, 180);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    // While the user is changing the search query, don't keep an active selection/scanner open.
    setSelectedKey(null);
    if (isScannerOpen) {
      void handleCloseScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelectItem = (rowKey: string) => {
    setSelectedKey(rowKey);
    // Focus barcode input after user selection (avoid stealing focus while typing search).
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const handleOpenScanner = async () => {
    if (!selectedItem) {
      showToast("Select a product first", "error");
      return;
    }

    setScannerError(null);
    setStopStream(false);
    hasScannedRef.current = false;
    setIsScannerOpen(true);
  };

  const handleCloseScanner = async () => {
    hasScannedRef.current = false;
    // Stop the camera stream first (workaround for webcam freeze on unmount),
    // then close the panel on the next tick.
    setStopStream(true);
    window.setTimeout(() => {
      setIsScannerOpen(false);
      setStopStream(false);
    }, 0);
  };

  const handleSave = async () => {
    if (!selectedItem || !selectedKey) {
      showToast("Select a product first", "error");
      return;
    }
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) {
      showToast("Barcode is required", "error");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/tools/fast-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: selectedItem.tableKey,
          productId: selectedItem.id,
          barcode: trimmedBarcode,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            item?: ToolItem;
            error?: string;
          }
        | null;

      if (!response.ok || !data?.success || !data.item) {
        throw new Error(data?.error ?? "Failed to save barcode");
      }

      setItems((current) =>
        current.map((item) => (item.id === data.item!.id ? data.item! : item))
      );
      setBarcode("");
      setQuery("");
      setItems([]);
      setSelectedKey(null);
      showToast("Barcode inserted", "success");
      barcodeInputRef.current?.focus();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save barcode";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="p-1">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Fast Barcode Inserter</h2>
      </div>

      <div className="grid gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Find Product (All Sections)
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, name, category, barcode..."
            className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-4 h-64 overflow-y-auto rounded-xl border border-border/60 bg-background/60 p-3">
        {isSearching ? (
          <div className="flex items-center justify-center py-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => {
              const rowKey = `${item.tableKey}:${item.id}`;
              const isActive = rowKey === selectedKey;
              return (
                <button
                  key={rowKey}
                  type="button"
                  onClick={() => handleSelectItem(rowKey)}
                  className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-foreground/40 bg-card"
                      : "border-border/60 bg-background/80 hover:border-border"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.section} • ID: {item.id}
                  </p>
                  {item.subtitle ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.subtitle}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground">
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            <p className="text-sm font-medium text-muted-foreground">ready when you are!</p>
          </div>
        )}
      </div>
      {!selectedItem && items.length > 0 && !isSearching ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: Click a result to select it, then scan/insert the barcode.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground">
          Barcode
          <div className="flex items-center gap-2">
            <input
              ref={barcodeInputRef}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
              placeholder="Scan/paste barcode"
              className="h-10 w-full flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void (isScannerOpen ? handleCloseScanner() : handleOpenScanner())}
              disabled={!selectedItem || isSaving}
              className="h-10 cursor-pointer rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isScannerOpen ? "Close" : "Scan"}
            </button>
          </div>

          {isScannerOpen ? (
            <div className="mt-2 rounded-xl border border-border/60 bg-background/80 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">Scanner</p>
                <button
                  type="button"
                  onClick={() => void handleCloseScanner()}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <div className="h-[220px] overflow-hidden rounded-lg border border-border/60 bg-card">
                <BarcodeScannerComponent
                  width="100%"
                  height={220}
                  facingMode="environment"
                  stopStream={stopStream}
                  delay={250}
                  onUpdate={(scanError, result) => {
                    void scanError;
                    if (hasScannedRef.current) return;
                    const text = extractScanText(result);
                    if (!text) return;
                    hasScannedRef.current = true;
                    setBarcode(text);
                    setScannerError(null);
                    showToast("Barcode scanned", "success");
                    setStopStream(true);
                    window.setTimeout(() => {
                      setIsScannerOpen(false);
                      setStopStream(false);
                      barcodeInputRef.current?.focus();
                      hasScannedRef.current = false;
                    }, 0);
                  }}
                  onError={(cameraError: unknown) => {
                    const message =
                      cameraError instanceof Error ? cameraError.message : "Camera error";
                    setScannerError(message);
                  }}
                />
              </div>
              {scannerError ? (
                <p className="mt-2 text-xs text-destructive">{scannerError}</p>
              ) : null}
            </div>
          ) : null}
        </label>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!selectedItem || isSaving}
          className="h-10 w-full cursor-pointer rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {isSaving ? "Saving..." : "Insert Barcode"}
        </button>
      </div>

      {selectedItem ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Selected: {selectedItem.section} #{selectedItem.id} {selectedItem.title}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
