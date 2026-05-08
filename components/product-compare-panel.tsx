"use client";

import { useEffect, useState } from "react";
import { ComparableProduct, PRODUCT_COMPARE_EVENT } from "@/lib/product-compare";
import { HoverZoom } from "@/components/ui/hover-zoom";

type CompareState = ComparableProduct[];

const addOrReplace = (items: CompareState, incoming: ComparableProduct) => {
  const existingIndex = items.findIndex((item) => item.id === incoming.id && item.source === incoming.source);
  if (existingIndex >= 0) {
    const clone = [...items];
    clone[existingIndex] = incoming;
    return clone;
  }
  if (items.length < 2) return [...items, incoming];
  return [items[1], incoming];
};

function CompareCard({
  item,
  onRemove,
}: {
  item: ComparableProduct;
  onRemove: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col rounded-xl border border-border/60 p-3">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-30 cursor-pointer rounded-md border border-red-500/50 bg-red-500/10 p-1 text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
        aria-label="Delete compared product"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
      <div className="-mx-3 -mt-3 mb-2 h-24 overflow-hidden rounded-t-xl bg-muted">
        {item.image ? (
          <HoverZoom className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          </HoverZoom>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
      </div>
      <div className="mb-3 h-10 pr-6">
        <p className="text-sm font-semibold leading-tight text-foreground line-clamp-2">{item.name}</p>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-[52px_1fr] items-baseline gap-2">
          <span className="text-xs font-medium text-muted-foreground">Price</span>
          <span className="text-lg font-extrabold leading-none text-foreground">{item.price}</span>
        </div>
        <div className="grid grid-cols-[52px_1fr] items-baseline gap-2">
          <span className="text-xs font-medium text-muted-foreground">Qty</span>
          <span className="text-lg font-extrabold leading-none text-foreground">{item.quantity}</span>
        </div>
      </div>
    </div>
  );
}

export function ProductComparePanel() {
  const [items, setItems] = useState<CompareState>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ComparableProduct>;
      if (!custom.detail) return;
      setItems((current) => addOrReplace(current, custom.detail));
      setVisible(true);
    };

    window.addEventListener(PRODUCT_COMPARE_EVENT, handler as EventListener);
    return () => window.removeEventListener(PRODUCT_COMPARE_EVENT, handler as EventListener);
  }, []);

  if (!visible) return null;

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-[min(92vw,560px)] rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setItems([])}
            className="rounded-md border border-border/60 px-2 py-1 text-xs text-foreground"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-md border border-border/60 px-2 py-1 text-xs text-foreground"
          >
            Close
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          {items[0] ? (
            <CompareCard item={items[0]} onRemove={() => setItems((current) => current.filter((_, index) => index !== 0))} />
          ) : (
            <div className="flex h-full min-h-[210px] items-center justify-center rounded-xl border border-dashed border-border/60 text-muted-foreground">
              <span className="text-3xl leading-none">+</span>
            </div>
          )}
        </div>
        <div>
          {items[1] ? (
            <CompareCard item={items[1]} onRemove={() => setItems((current) => current.filter((_, index) => index !== 1))} />
          ) : (
            <div className="flex h-full min-h-[210px] items-center justify-center rounded-xl border border-dashed border-border/60 text-muted-foreground">
              <span className="text-3xl leading-none">+</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
