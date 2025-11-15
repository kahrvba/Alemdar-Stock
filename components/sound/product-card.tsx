import Image from "next/image";
import { SoundProduct } from "@/lib/services/sound";
import { HoverZoom } from "@/components/ui/hover-zoom";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: SoundProduct;
  onEdit?: (product: SoundProduct) => void;
  onDelete?: (product: SoundProduct) => void;
  onAddToCart?: (product: SoundProduct) => void;
  isDeleting?: boolean;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function ProductCard({ product, onEdit, onDelete, onAddToCart, isDeleting }: ProductCardProps) {
  const priceLabel =
    product.price && Number(product.price) > 0
      ? usdFormatter.format(Number(product.price))
      : "null";

  return (
    <article 
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border-4 border-transparent bg-card/80 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.4)] transition hover:bg-card"
      )}
    >
      <div className="relative h-90 w-full overflow-hidden rounded-t-3xl bg-muted">
        {product.image_filename ? (
          <HoverZoom className="relative h-full w-full">
            <Image
              src={product.image_filename}
              alt={product.english_name ?? "Sound product"}
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
            {product.english_name ?? "Unnamed product"}
          </h2>
          {product.turkish_name ? (
            <p className="text-sm text-muted-foreground">{product.turkish_name}</p>
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
            {["Edit", "Delete", "Print", "Add to cart"].map((label) => (
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
                  }
                }}
                disabled={(label === "Delete" && isDeleting) || label === "Print"}
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

