"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Printer, Search } from "lucide-react";
import type { TztOrderProduct } from "@/lib/tzt-order-matches";
import { cn } from "@/lib/utils";

type TztOrderClientProps = {
  products: TztOrderProduct[];
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const printLabel = (product: TztOrderProduct) => {
  if (typeof window === "undefined") return;

  const barcodeSrc = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    String(product.id)
  )}&scale=2&height=11&includetext=false`;
  const popup = window.open("", "_blank", "width=640,height=720");

  if (!popup) {
    window.alert("Could not open print window.");
    return;
  }

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(product.name)}</title>
        <style>
          @page { size: 60mm 30mm; margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, sans-serif; }
          .label { box-sizing: border-box; break-after: page; position: relative; width: 60mm; height: 30mm; overflow: hidden; transform: rotate(180deg); transform-origin: center center; }
          .name { position: absolute; left: 1mm; top: 1.2mm; right: 1mm; height: 10mm; overflow: hidden; font-size: 3.6mm; line-height: 1.05; font-weight: 800; word-break: break-word; }
          .barcode { position: absolute; left: 1mm; top: 12mm; width: 30mm; height: 10mm; object-fit: fill; }
          .barcode-value { position: absolute; left: 1mm; top: 22.8mm; width: 30mm; overflow: hidden; text-align: center; font-size: 3.4mm; font-weight: 800; white-space: nowrap; }
          .number { position: absolute; right: 1mm; top: 14mm; width: 24mm; text-align: right; font-size: 5.2mm; font-weight: 900; line-height: 1; }
        </style>
      </head>
      <body>
        <section class="label">
          <div class="name">${escapeHtml(product.name)}</div>
          <img class="barcode" src="${barcodeSrc}" alt="Barcode" />
          <div class="barcode-value">${escapeHtml(String(product.id))}</div>
          <div class="number">No ${escapeHtml(String(product.id))}</div>
        </section>
        <script>
          const printNow = () => { window.focus(); window.print(); };
          window.addEventListener("afterprint", () => window.close(), { once: true });
          setTimeout(printNow, 700);
        </script>
      </body>
    </html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};

export function TztOrderClient({ products }: TztOrderClientProps) {
  const [query, setQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      products.map((product) => [`${product.tableName}:${product.id}`, product.quantity])
    )
  );
  const [savedQuantities, setSavedQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      products.map((product) => [`${product.tableName}:${product.id}`, product.quantity])
    )
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;

    return products.filter((product) =>
      [product.name, String(product.id), product.tztGoodsId]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [products, query]);

  const currentProduct =
    filteredProducts[Math.min(currentIndex, Math.max(0, filteredProducts.length - 1))] ?? null;
  const currentKey = currentProduct ? `${currentProduct.tableName}:${currentProduct.id}` : "";
  const currentQuantity = currentProduct
    ? quantities[currentKey] ?? currentProduct.quantity
    : 0;
  const isDirty = currentProduct
    ? currentQuantity !== (savedQuantities[currentKey] ?? currentProduct.quantity)
    : false;
  const isSaving = currentKey ? savingKey === currentKey : false;
  const currentPosition = currentProduct
    ? Math.min(currentIndex + 1, filteredProducts.length)
    : 0;

  const updateQuantity = (product: TztOrderProduct, delta: number) => {
    const key = `${product.tableName}:${product.id}`;
    setQuantities((current) => {
      const nextQuantity = Math.max(0, Math.min(9999, (current[key] ?? product.quantity) + delta));
      return { ...current, [key]: nextQuantity };
    });
    setSaveMessage("");
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setCurrentIndex(0);
  };

  const goPrevious = () => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const goNext = () => {
    setCurrentIndex((index) => Math.min(filteredProducts.length - 1, index + 1));
  };

  const saveQuantity = async (product: TztOrderProduct) => {
    const key = `${product.tableName}:${product.id}`;
    const quantity = quantities[key] ?? product.quantity;

    setSavingKey(key);
    setSaveMessage("");

    try {
      const response = await fetch("/api/tzt-order/quantity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName: product.tableName,
          id: product.id,
          quantity,
        }),
      });

      if (!response.ok) throw new Error("Failed to save quantity");

      const saved = (await response.json()) as { quantity?: number };
      const savedQuantity = Number(saved.quantity ?? quantity);

      setQuantities((current) => ({ ...current, [key]: savedQuantity }));
      setSavedQuantities((current) => ({ ...current, [key]: savedQuantity }));
      setSaveMessage("Saved");
    } catch (error) {
      console.error("[tzt-order] save error:", error);
      setSaveMessage("Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-[oklch(0.98_0.012_92)] px-3 py-5 text-[oklch(0.18_0.025_92)] dark:bg-background dark:text-foreground sm:px-5 sm:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="sticky top-20 z-20 border border-[oklch(0.77_0.05_92)] bg-[oklch(0.96_0.018_92)] p-3 shadow-[0_16px_60px_-46px_rgba(48,34,16,0.7)] dark:border-border dark:bg-card">
          <label className="flex h-12 items-center gap-3 border border-[oklch(0.72_0.055_92)] bg-[oklch(0.995_0.006_92)] px-3 dark:border-input dark:bg-background">
            <Search className="size-5 shrink-0" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search products"
              className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-[oklch(0.46_0.025_92)] dark:placeholder:text-muted-foreground"
              autoFocus
            />
          </label>
        </div>

        {currentProduct ? (
          <article className="grid gap-4 border border-[oklch(0.78_0.045_92)] bg-[oklch(0.995_0.006_92)] p-4 dark:border-border dark:bg-card sm:p-6">
            <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.2em] text-[oklch(0.44_0.035_92)] dark:text-muted-foreground">
              <span>
                {currentPosition} / {filteredProducts.length}
              </span>
              <span>No {currentProduct.id}</span>
            </div>

            <h2 className="min-h-28 text-2xl font-black leading-tight sm:text-4xl">
              {currentProduct.name}
            </h2>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div className="grid grid-cols-[44px_1fr_44px] items-center">
                <button
                  type="button"
                  onClick={() => updateQuantity(currentProduct, -1)}
                  className="grid h-14 place-items-center border border-[oklch(0.68_0.055_92)] bg-[oklch(0.93_0.025_92)] transition hover:bg-[oklch(0.88_0.045_92)] dark:border-border dark:bg-secondary dark:hover:bg-accent"
                  aria-label={`Decrease ${currentProduct.name} quantity`}
                >
                  <Minus className="size-5" aria-hidden="true" />
                </button>
                <output className="grid h-14 place-items-center border-y border-[oklch(0.68_0.055_92)] bg-background text-3xl font-black tabular-nums dark:border-border">
                  {currentQuantity}
                </output>
                <button
                  type="button"
                  onClick={() => updateQuantity(currentProduct, 1)}
                  className="grid h-14 place-items-center border border-[oklch(0.68_0.055_92)] bg-[oklch(0.93_0.025_92)] transition hover:bg-[oklch(0.88_0.045_92)] dark:border-border dark:bg-secondary dark:hover:bg-accent"
                  aria-label={`Increase ${currentProduct.name} quantity`}
                >
                  <Plus className="size-5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => printLabel(currentProduct)}
                className={cn(
                  "flex h-14 min-w-36 items-center justify-center gap-2 bg-[oklch(0.24_0.04_92)] px-5 text-base font-black uppercase text-[oklch(0.98_0.01_92)] transition hover:bg-[oklch(0.32_0.055_92)]",
                  "dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                )}
              >
                <Printer className="size-5" aria-hidden="true" />
                Print
              </button>
              <button
                type="button"
                onClick={() => saveQuantity(currentProduct)}
                disabled={isSaving || !isDirty}
                className="flex h-14 min-w-36 items-center justify-center gap-2 border border-[oklch(0.24_0.04_92)] bg-[oklch(0.995_0.006_92)] px-5 text-base font-black uppercase text-[oklch(0.24_0.04_92)] transition hover:bg-[oklch(0.9_0.035_92)] disabled:cursor-not-allowed disabled:opacity-45 dark:border-border dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-accent"
              >
                <Check className="size-5" aria-hidden="true" />
                {isSaving ? "Saving" : "Save"}
              </button>
            </div>

            <div className="min-h-5 text-sm font-black text-[oklch(0.44_0.035_92)] dark:text-muted-foreground">
              {isDirty ? "Unsaved quantity" : saveMessage}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={goPrevious}
                disabled={currentPosition <= 1}
                className="flex h-12 items-center justify-center gap-2 border border-[oklch(0.68_0.055_92)] bg-[oklch(0.93_0.025_92)] text-sm font-black uppercase transition hover:bg-[oklch(0.88_0.045_92)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-secondary dark:hover:bg-accent"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={currentPosition >= filteredProducts.length}
                className="flex h-12 items-center justify-center gap-2 border border-[oklch(0.68_0.055_92)] bg-[oklch(0.93_0.025_92)] text-sm font-black uppercase transition hover:bg-[oklch(0.88_0.045_92)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-secondary dark:hover:bg-accent"
              >
                Next
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </article>
        ) : (
          <div className="border border-[oklch(0.78_0.045_92)] bg-[oklch(0.995_0.006_92)] p-8 text-center text-sm font-black dark:border-border dark:bg-card">
            No matching product.
          </div>
        )}
      </div>
    </section>
  );
}
