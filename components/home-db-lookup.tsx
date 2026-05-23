"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyBarcodeButton } from "@/components/ui/copy-barcode-button";

type SearchItem = {
  tableKey: string;
  id: number;
  title: string;
  barcode: string | null;
};

type SearchResponse = {
  items?: SearchItem[];
};

const VALID_QUERY_REGEX = /^[a-zA-Z0-9\s]+$/;

export function HomeDbLookup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isNumericQuery = /^\d+$/.test(trimmedQuery);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!VALID_QUERY_REGEX.test(trimmedQuery)) {
      setResults([]);
      setError("Only ID number or name is allowed");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/universal-search?query=${encodeURIComponent(trimmedQuery)}&limit=5&perSectionLimit=20`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to search");
        }

        const data = (await response.json()) as SearchResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        const filtered = isNumericQuery
          ? items.filter((item) => item.id === Number(trimmedQuery))
          : items;

        const unique = filtered.filter(
          (item, index, arr) =>
            index ===
            arr.findIndex(
              (x) => x.tableKey === item.tableKey && x.id === item.id,
            ),
        );

        setResults(unique);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        const message =
          fetchError instanceof Error ? fetchError.message : "Search failed";
        setError(message);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery, isNumericQuery]);

  const hasResults = useMemo(() => results.length > 0, [results.length]);

  return (
    <section className="w-full rounded-2xl border overflow-hidden border-border/60 bg-card/70">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by ID or name"
        className="h-10 w-full bg-background px-3 text-sm text-foreground outline-none"
      />

      {trimmedQuery ? (
        <div className="max-h-64 border-t border-border/60  overflow-y-auto p-2">
          {isLoading ? (
            <p className="py-2 text-xs text-muted-foreground">Searching...</p>
          ) : error ? (
            <p className="py-2 text-xs text-destructive">{error}</p>
          ) : hasResults ? (
            <div className="space-y-1">
              {results.map((item) => (
                <div
                  key={`${item.tableKey}-${item.id}`}
                  className="text-sm text-foreground"
                >
                  <div className="truncate font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.barcode?.trim() || "No barcode"}
                    <CopyBarcodeButton barcode={item.barcode} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">No results</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
