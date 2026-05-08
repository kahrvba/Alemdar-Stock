import Image from "next/image";
import { BatteryProduct } from "@/lib/services/batteries";
import { HoverZoom } from "@/components/ui/hover-zoom";
import { printProductLabel } from "@/lib/print-product-label";
import { addProductToCompare } from "@/lib/product-compare";
import { cn } from "@/lib/utils";
import { CopyBarcodeButton } from "@/components/ui/copy-barcode-button";

type BatteryProductExtended = BatteryProduct & {
  quantity?: number | null;
  price?: number | string | null;
  image_filename: string | null;
};

export type ProductCardProps = {
  product: BatteryProductExtended;
  onEdit: (product: BatteryProductExtended) => void;
  onDelete: (product: BatteryProductExtended) => void;
  onAddToCart?: (product: BatteryProductExtended) => void;
  onSend?: (product: BatteryProductExtended) => void;
  isDeleting?: boolean;
  isSelected?: boolean;
  backgroundColor?: string;
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
  onSend,
  isDeleting,
  isSelected,
  backgroundColor = "bg-card/80",
}: ProductCardProps) {
  const priceValue = Number(product.price ?? 0);
  const priceLabel = Number.isFinite(priceValue) ? usdFormatter.format(priceValue) : usdFormatter.format(0);
  const modelLabel = product.model ?? "Unnamed battery";
  const barcodeLabel = product.barcode?.trim() || "-";
  const quantityValue =
    typeof product.quantity === "number" && Number.isFinite(product.quantity)
      ? Math.max(0, product.quantity)
      : 0;
  const imageSrc = (product.image_filename ?? "").trim();

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border-4 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.4)] transition hover:bg-card cursor-pointer",
        backgroundColor,
        isSelected ? "border-red-500" : "border-transparent"
      )}
      onClick={() => onSend?.(product)}
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
        {imageSrc ? (
          <HoverZoom className="relative h-full w-full">
            <Image
              src={imageSrc}
              alt={modelLabel}
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
              unoptimized
              loader={({ src }) => src}
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
            Battery
          </span>
          <h2 className="text-xl font-semibold text-foreground">{modelLabel}</h2>
        </div>
        <div className="mt-auto flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 min-w-0">
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-4 py-1 font-semibold text-emerald-600 dark:text-emerald-300 text-center">
              Qty: {quantityValue}
            </span>
            <span className="flex min-h-10 items-center justify-center rounded-full bg-foreground/90 px-5 text-xs font-semibold uppercase tracking-[0.35em] text-background text-center leading-tight">
              {barcodeLabel} <CopyBarcodeButton barcode={typeof product.barcode === "string" ? product.barcode : ""} /></span>
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
