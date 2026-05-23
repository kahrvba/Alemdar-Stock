"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Search, X } from "lucide-react";
import { useNavigationOverlay } from "@/components/navigation-overlay-provider";

const SEARCH_HISTORY_KEY = "universal-search:history";
const SEARCH_HISTORY_LIMIT = 5;

const readHistory = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

const writeHistory = (entries: string[]) => {
  if (typeof window === "undefined") return;
  try {
    const capped = entries.slice(0, SEARCH_HISTORY_LIMIT);
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(capped));
  } catch {
    // ignore quota / serialization errors
  }
};

type UniversalSearchItem = {
  tableKey: string;
  section: string;
  id: number;
  title: string;
  subtitle: string | null;
  image: string | null;
  price: string | null;
  quantity: number;
  href: string;
};

type UniversalSearchResponse = {
  items?: UniversalSearchItem[];
  total?: number;
};

const formatPrice = (value: string | null) => {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
};

export function UniversalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const { showOverlay } = useNavigationOverlay();

  const trimmedQuery = query.trim();

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const pushHistory = useCallback((entry: string) => {
    const value = entry.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    setHistory((current) => {
      const existingCovers = current.some((item) => {
        const other = item.toLowerCase();
        return other === lower || other.startsWith(lower);
      });
      if (existingCovers) return current;
      const filtered = current.filter((item) => {
        const other = item.toLowerCase();
        return other !== lower && !lower.startsWith(other);
      });
      const next = [value, ...filtered].slice(0, SEARCH_HISTORY_LIMIT);
      writeHistory(next);
      return next;
    });
  }, []);

  const removeHistoryEntry = useCallback((entry: string) => {
    setHistory((current) => {
      const next = current.filter((item) => item !== entry);
      writeHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    writeHistory([]);
  }, []);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/universal-search?query=${encodeURIComponent(trimmedQuery)}&limit=30`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to search inventory");
        }

        const data = (await response.json()) as UniversalSearchResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        setResults(items);
        if (items.length > 0) {
          pushHistory(trimmedQuery);
        }
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
  }, [trimmedQuery, pushHistory]);

  const hasResults = useMemo(() => results.length > 0, [results.length]);
  const hasHistory = history.length > 0;

  return (
    <section className="w-full max-w-5xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="universal-inventory-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search all sections by ID, name, category, brand, material..."
          className="h-12 w-full rounded-full border border-border/60 bg-muted/50 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-border/40"
        />
      </div>

      {!trimmedQuery && hasHistory && isFocused ? (
        <div
          onMouseDown={(event) => event.preventDefault()}
          className="mt-3 rounded-2xl border border-border/60 bg-background/70 p-3"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Recent searches
            </div>
            <button
              type="button"
              onClick={clearHistory}
              className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {history.map((entry) => (
              <li
                key={entry}
                className="group flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-border/60 hover:bg-card/70"
              >
                <button
                  type="button"
                  onClick={() => setQuery(entry)}
                  className="flex flex-1 items-center gap-2 text-left text-sm text-foreground"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{entry}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeHistoryEntry(entry)}
                  aria-label={`Remove ${entry} from history`}
                  className="rounded-full p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {trimmedQuery ? (
        <div className="mt-3 rounded-2xl border border-border/60 bg-background/70 p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Searching all sections...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : hasResults ? (
            <div className="grid max-h-[26rem] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {results.map((item) => (
                <Link
                  key={`${item.tableKey}-${item.id}`}
                  href={item.href}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    showOverlay();
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-2 transition hover:border-foreground/30 hover:bg-card"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        unoptimized
                        loader={({ src }) => src}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      {item.section}
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.subtitle ?? `ID ${item.id}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-muted-foreground">
                      Qty: {Math.max(0, item.quantity ?? 0)}
                    </p>
                    {item.price ? (
                      <p className="text-xs font-semibold text-foreground">
                        {formatPrice(item.price)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for &quot;{trimmedQuery}&quot;.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
