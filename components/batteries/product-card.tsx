import Image from "next/image";
import { BatteryProduct } from "@/lib/services/batteries";
import { HoverZoom } from "@/components/ui/hover-zoom";
import { cn } from "@/lib/utils";

export type ProductCardProps = {
  product: BatteryProduct;
  onEdit: (product: BatteryProduct) => void;
  onDelete: (product: BatteryProduct) => void;
  onAddToCart?: (product: BatteryProduct) => void;
  onPrint?: (product: BatteryProduct) => void;
  isDeleting?: boolean;
  isSelected?: boolean;
  backgroundColor?: string;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function ProductCard({ product, onEdit, onDelete, onAddToCart, isDeleting }: ProductCardProps) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border-4 border-transparent bg-card/80 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.4)] transition hover:bg-card"
      )}
    >
      <span className="absolute left-4 top-4 z-10 rounded-full bg-background/95 px-5 py-2 text-base font-bold uppercase tracking-wide text-foreground shadow-lg">
        id {product.id}
      </span>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">{product.model ?? "Unnamed"}</h2>
          <p className="text-sm text-muted-foreground">{product.volt ?? "-"}</p>
        </div>
        <div className="mt-auto flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit?.(product); }}
              className="rounded-2xl border border-border/60 bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-foreground/40 hover:bg-muted"
            >Edit</button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete?.(product); }}
              disabled={isDeleting}
              className="rounded-2xl border border-border/60 bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-foreground/40 hover:bg-muted disabled:opacity-60"
            >{isDeleting ? "Deleting..." : "Delete"}</button>
          </div>
        </div>
      </div>
    </article>
  );
}

