import Image from "next/image";
import { ChargerProduct } from "@/lib/services/chargers";
import { HoverZoom } from "@/components/ui/hover-zoom";
import { printProductLabel } from "@/lib/print-product-label";
import { addProductToCompare } from "@/lib/product-compare";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: ChargerProduct;
  onEdit?: (product: ChargerProduct) => void;
  onDelete?: (product: ChargerProduct) => void;
  onAddToCart?: (product: ChargerProduct) => void;
  isDeleting?: boolean;
  backgroundColor?: string;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function ProductCard({ product, onEdit, onDelete, onAddToCart, isDeleting, backgroundColor = "bg-card/80" }: ProductCardProps) {
  const priceLabel =
    product.price && Number(product.price) > 0
      ? usdFormatter.format(Number(product.price))
      : "Contact for price";
  const barcodeLabel = product.barcode?.trim() || "No barcode";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border-4 border-transparent shadow-[0_25px_80px_-40px_rgba(0,0,0,0.4)] transition hover:bg-card",
        backgroundColor
      )}
    >
      <span className="absolute left-4 top-4 z-10 rounded-full bg-background/95 px-5 py-2 text-base font-bold uppercase tracking-wide text-foreground shadow-lg">
        id {product.id}
      </span>
      <div className="relative h-90 w-full overflow-hidden rounded-t-3xl bg-muted">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            addProductToCompare(product as Record<string, unknown>);
          }}
          className="absolute right-3 top-3 z-20 rounded-md bg-background/90 px-2 py-1 text-xs font-semibold text-foreground shadow"
        >
          Compare
        </button>
        {product.image_filename ? (
          <HoverZoom className="relative h-full w-full">
            <Image
              src={product.image_filename}
              alt={product.english_names ?? "Charger product"}
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
            {product.english_names ?? "Unnamed product"}
          </h2>
          {product.turkish_names ? (
            <p className="text-sm text-muted-foreground">{product.turkish_names}</p>
          ) : null}
        </div>
        <div className="mt-auto flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 min-w-0">
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-4 py-1 font-semibold text-emerald-600 dark:text-emerald-300 text-center">
              Qty: {Math.max(0, product.quantity ?? 0)}
            </span>
            <span className="flex min-h-[2.5rem] items-center justify-center rounded-full bg-foreground/90 px-5 text-xs font-semibold uppercase tracking-[0.35em] text-background text-center leading-tight">
              {barcodeLabel}
            </span>
            <span className="shrink-0 rounded-full bg-primary px-4 py-1 text-base font-semibold text-primary-foreground text-center">
              {priceLabel}
            </span>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            {["Edit", "Delete", "Add to cart", "Print"].map((label) => (
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
                  }
                }}
                disabled={label === "Delete" && isDeleting}
                className="rounded-2xl border border-border/60 bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-foreground/40 hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {label === "Delete" && isDeleting ? "Deleting..." : label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
