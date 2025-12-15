"use client";

import { useMemo, useState } from "react";

export type ScrapedProduct = {
  name: string | null;
  brand: string | null;
  image: string | null;
};

type Props = {
  products: ScrapedProduct[];
  deleteProduct: (formData: FormData) => void | Promise<void>;
};

export function MerterAdaptorsClient({ products, deleteProduct }: Props) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const matchFlags = useMemo(() => {
    if (!normalizedQuery) return products.map(() => true);
    const terms = normalizedQuery.split(/\s+/);
    return products.map((product) => {
      const haystack = `${product.name ?? ""} ${product.brand ?? ""}`
        .toLowerCase()
        .trim();
      return terms.every((term) => haystack.includes(term));
    });
  }, [products, normalizedQuery]);

  const matchedCount = useMemo(
    () => matchFlags.filter(Boolean).length,
    [matchFlags]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Search by name or brand
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Powermaster 12V, Weko, HDMI..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="text-xs text-muted-foreground sm:w-40 sm:text-right">
          Showing{" "}
          <span className="font-semibold">
            {matchedCount.toLocaleString("en-US")}
          </span>{" "}
          of{" "}
          <span className="font-semibold">
            {products.length.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No scraped products found.
        </p>
      ) : matchedCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No products match{" "}
          <span className="font-medium">"{query.trim()}"</span>.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => {
            if (!matchFlags[index]) return null;
            return (
              <li key={index} className="flex flex-col gap-3">
                {product.image ? (
                  <div className="flex w-full items-center justify-center bg-muted">
                    <img
                      src={product.image}
                      alt={product.name ?? "Adaptör"}
                      className="max-h-64 w-auto max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    No image
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-2">
                  <div>
                    <p className="line-clamp-2 text-sm font-medium">
                      {product.name ?? "İsimsiz ürün"}
                    </p>
                  </div>

                  {product.brand && (
                    <div className="text-xs text-muted-foreground">
                      Brand:{" "}
                      <span className="font-medium">{product.brand}</span>
                    </div>
                  )}

                  <form
                    action={deleteProduct}
                    className="mt-3 flex justify-end"
                  >
                    <input
                      type="hidden"
                      name="index"
                      value={String(index)}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                    >
                      Delete from JSON
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


