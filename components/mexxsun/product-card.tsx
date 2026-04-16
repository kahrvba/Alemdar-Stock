import { useState } from "react";
import Image from "next/image";
import { MexxsunProduct } from "@/lib/services/mexxsun";
import { HoverZoom } from "@/components/ui/hover-zoom";
import { printProductLabel } from "@/lib/print-product-label";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: MexxsunProduct;
  onEdit?: (product: MexxsunProduct) => void;
  onDelete?: (product: MexxsunProduct) => void;
  onAddToCart?: (product: MexxsunProduct) => void;
  isDeleting?: boolean;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function ProductCard({
  product,
  onEdit,
  onDelete,
  onAddToCart,
  isDeleting,
}: ProductCardProps) {
  const [isToptanModalOpen, setIsToptanModalOpen] = useState(false);
  const priceLabel =
    product.selling_price && Number(product.selling_price) > 0
      ? usdFormatter.format(Number(product.selling_price))
      : "null";
  const wholesalePrice = Number(product.wholesale_price);
  const toptanLabel =
    Number.isFinite(wholesalePrice) && wholesalePrice > 0
      ? usdFormatter.format(wholesalePrice)
      : "YOK";

  return (
    <>
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border-4 border-transparent bg-card/80 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.4)] transition hover:bg-card"
      )}
    >
      <span className="absolute left-4 top-4 z-10 rounded-full bg-background/95 px-5 py-2 text-base font-bold uppercase tracking-wide text-foreground shadow-lg">
        id {product.id}
      </span>
      {product.is_new ? (
        <span className="absolute right-4 top-4 z-10 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50 shadow-lg">
          New
        </span>
      ) : null}
      <div className="relative h-90 w-full overflow-hidden rounded-t-3xl bg-muted">
        {product.image_filename ? (
          <HoverZoom className="relative h-full w-full">
            <Image
              src={product.image_filename}
              alt={product.name ?? "Mexxsun product"}
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </HoverZoom>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500 dark:text-emerald-300">
            {product.category ?? "Uncategorized"}
          </span>
          <h2 className="text-xl font-semibold text-foreground">
            {product.name ?? "Unnamed product"}
          </h2>
          {product.rating ? (
            <p className="text-sm text-muted-foreground">Rating: {product.rating}</p>
          ) : null}
        </div>
        <div className="mt-auto flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-emerald-500/15 px-4 py-1 font-semibold text-emerald-600 dark:text-emerald-300">
              Qty: {Math.max(0, product.quantity ?? 0)}
            </span>
            <span className="rounded-full bg-primary px-4 py-1 text-base font-semibold text-primary-foreground">
              {priceLabel}
            </span>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            {["Edit", "Delete", "Add to cart", "Print", "toptan fiyat"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (label === "Edit") {
                    onEdit?.(product);
                  } else if (label === "Delete") {
                    onDelete?.(product);
                  } else if (label === "Add to cart") {
                    onAddToCart?.(product);
                  } else if (label === "Print") {
                    printProductLabel(product);
                  } else if (label === "toptan fiyat") {
                    setIsToptanModalOpen(true);
                  }
                }}
                disabled={label === "Delete" && isDeleting}
                className={cn(
                  "rounded-2xl border border-border/60 bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-foreground/40 hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
                  label === "toptan fiyat" && "bg-amber-100 text-amber-900 border-amber-300"
                )}
              >
                {label === "Delete" && isDeleting ? "Deleting..." : label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
    {isToptanModalOpen ? (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
        onClick={() => setIsToptanModalOpen(false)}
      >
        <div
          className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-center text-2xl font-extrabold uppercase tracking-[0.2em] text-amber-600">
            TOPTAN FIYAT
          </h3>
          <p className="mt-4 text-center text-xl font-bold text-foreground">
            {product.name ?? `Product #${product.id}`}
          </p>
          <p className="mt-3 text-center text-4xl font-extrabold text-foreground">
            {toptanLabel}
          </p>
          <button
            type="button"
            onClick={() => setIsToptanModalOpen(false)}
            className="mt-6 w-full rounded-2xl bg-amber-500 px-5 py-3 text-lg font-extrabold text-black transition hover:bg-amber-400"
          >
            KAPAT
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
