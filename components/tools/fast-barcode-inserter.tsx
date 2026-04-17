"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";

type ToolSection = {
  key: string;
  label: string;
};

type ToolItem = {
  id: number;
  title: string;
  barcode: string;
};

export function FastBarcodeInserter() {
  const [sections] = useState<ToolSection[]>([
    { key: "arduino", label: "Arduino" },
    { key: "mainled", label: "Cable" },
    { key: "sound", label: "Sound" },
    { key: "batteries", label: "Batteries" },
    { key: "fans", label: "Fans" },
    { key: "others", label: "Others" },
  ]);
  const [section, setSection] = useState("arduino");
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [items, setItems] = useState<ToolItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const runSearch = async (sectionValue: string, queryValue: string) => {
    const trimmed = queryValue.trim();
    if (!trimmed) {
      setItems([]);
      setSelectedId(null);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/tools/fast-barcode?section=${encodeURIComponent(sectionValue)}&query=${encodeURIComponent(trimmed)}&limit=10`,
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
      setSelectedId((current) => {
        if (current && nextItems.some((item) => item.id === current)) return current;
        return nextItems[0]?.id ?? null;
      });
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : "Search failed";
      setError(message);
      setItems([]);
      setSelectedId(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      void runSearch(section, query);
    }, 180);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query, section]);

  useEffect(() => {
    if (selectedItem) {
      barcodeInputRef.current?.focus();
    }
  }, [selectedItem?.id]);

  const handleSave = async () => {
    if (!selectedItem || !selectedId) {
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
          section,
          productId: selectedId,
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
      setSelectedId(null);
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

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Section
          <select
            value={section}
            onChange={(event) => {
              setSection(event.target.value);
              setItems([]);
              setSelectedId(null);
              setError(null);
            }}
            className="h-10 cursor-pointer rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {sections.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Find Product
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, name, category..."
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
              const isActive = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-foreground/40 bg-card"
                      : "border-border/60 bg-background/80 hover:border-border"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">ID: {item.id}</p>
                  {item.barcode.trim() ? (
                    <div className="mt-1 flex items-center gap-1">
                      <img
                        src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23dc2626'/%3E%3Cpath d='M12 7v7' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='12' cy='17.5' r='1.2' fill='white'/%3E%3C/svg%3E"
                        alt="Has barcode"
                        className="h-4 w-4"
                      />
                      <span className="text-[11px] font-semibold text-red-600">
                        Barcode already exists
                      </span>
                    </div>
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

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Barcode
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
            className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!selectedItem || isSaving}
          className="mt-6 h-10 cursor-pointer rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Insert Barcode"}
        </button>
      </div>

      {selectedItem ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Selected: #{selectedItem.id} {selectedItem.title}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
