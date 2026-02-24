# Universal Search Integration Pack (Exact Stock Behavior)

Use this file as the source of truth to copy into the official website.

## 1) API Route
Create:
- `app/api/universal-search/route.ts`

```ts
import { NextResponse } from "next/server";
import pool from "@/lib/db";

type UniversalSearchRow = {
  table_key: string;
  section_label: string;
  route_path: string;
  id: number;
  title: string | null;
  subtitle: string | null;
  image_filename: string | null;
  price: string | null;
  quantity: number | null;
  relevance_score: number;
};

type SearchSectionConfig = {
  tableKey: string;
  sectionLabel: string;
  routePath: string;
  tableName: string;
  titleExpr: string;
  subtitleExpr: string;
  imageExpr: string;
  priceExpr: string;
  quantityExpr: string;
  searchableExpr: string;
};

const SEARCH_SECTIONS: SearchSectionConfig[] = [
  {
    tableKey: "arduino",
    sectionLabel: "Arduino",
    routePath: "/arduino",
    tableName: "public.arduino",
    titleExpr: "english_names",
    subtitleExpr: "COALESCE(turkish_names, category)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))",
  },
  {
    tableKey: "mainled",
    sectionLabel: "Cable",
    routePath: "/cable",
    tableName: "public.mainled",
    titleExpr: "english_name",
    subtitleExpr: "COALESCE(turkish_name, category)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))",
  },
  {
    tableKey: "solardb",
    sectionLabel: "Solar",
    routePath: "/solar",
    tableName: "public.solardb",
    titleExpr: "name",
    subtitleExpr: "category",
    imageExpr: "image_filename",
    priceExpr: "selling_price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(rating, ''))",
  },
  {
    tableKey: "sound",
    sectionLabel: "Sound",
    routePath: "/sound",
    tableName: "public.sound",
    titleExpr: "english_name",
    subtitleExpr: "COALESCE(turkish_name, category)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, '') || ' ' || COALESCE(kodu, ''))",
  },
  {
    tableKey: "batteries",
    sectionLabel: "Batteries",
    routePath: "/batteries",
    tableName: "public.batteries",
    titleExpr: "model",
    subtitleExpr: "CONCAT('Volt: ', COALESCE(volt::text, '-'))",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr: "LOWER(COALESCE(model, '') || ' ' || COALESCE(volt::text, ''))",
  },
  {
    tableKey: "tv_remotes",
    sectionLabel: "TV Remotes",
    routePath: "/tv-remotes",
    tableName: "public.tv_remotes",
    titleExpr: "name",
    subtitleExpr: "CONCAT_WS(' • ', brand, category)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(name, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(category, ''))",
  },
  {
    tableKey: "filaments",
    sectionLabel: "Filaments",
    routePath: "/filaments",
    tableName: "public.filaments",
    titleExpr: "name",
    subtitleExpr: "CONCAT_WS(' • ', brand, material, color)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(name, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(material, '') || ' ' || COALESCE(color, '') || ' ' || COALESCE(variant, ''))",
  },
  {
    tableKey: "fans",
    sectionLabel: "Fans",
    routePath: "/fans",
    tableName: "public.fans",
    titleExpr: "english_names",
    subtitleExpr: "COALESCE(turkish_names, category)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))",
  },
  {
    tableKey: "others",
    sectionLabel: "Others",
    routePath: "/others",
    tableName: "public.others",
    titleExpr: "english_names",
    subtitleExpr: "COALESCE(turkish_names, category)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))",
  },
  {
    tableKey: "electric",
    sectionLabel: "Electric",
    routePath: "/electric",
    tableName: "public.electric",
    titleExpr: "english_names",
    subtitleExpr: "COALESCE(turkish_names, category)",
    imageExpr: "image_filename",
    priceExpr: "price::text",
    quantityExpr: "COALESCE(quantity, 0)",
    searchableExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, ''))",
  },
];

const COMPACT_REGEX = "[[:space:]/_.-]+";
const MIN_COMPACT_QUERY_LENGTH = 3;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 80)
      : 30;
  const perSectionLimitParam = Number(searchParams.get("perSectionLimit"));
  const perSectionLimit =
    Number.isFinite(perSectionLimitParam) && perSectionLimitParam > 0
      ? Math.min(Math.floor(perSectionLimitParam), 12)
      : 5;

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const numericQuery = /^\d+$/.test(query) ? Number(query) : null;
  const normalizedQuery = query.toLowerCase();
  const compactQuery = normalizedQuery.replace(/[ /_.-]+/g, "");
  const escapedLike = `%${escapeLike(normalizedQuery)}%`;
  const escapedPrefixLike = `${escapeLike(normalizedQuery)}%`;
  const escapedCompactLike =
    compactQuery.length >= MIN_COMPACT_QUERY_LENGTH
      ? `%${escapeLike(compactQuery)}%`
      : null;

  const unions = SEARCH_SECTIONS.map((section) => {
    const standardExpr = `REGEXP_REPLACE((${section.searchableExpr}), '[[:space:]]+', ' ', 'g')`;
    const boundaryExpr = `TRIM(REGEXP_REPLACE((${section.searchableExpr}), '${COMPACT_REGEX}', ' ', 'g'))`;
    const compactExpr = `REGEXP_REPLACE((${section.searchableExpr}), '${COMPACT_REGEX}', '', 'g')`;

    return `
      SELECT
        '${section.tableKey}'::text AS table_key,
        '${section.sectionLabel}'::text AS section_label,
        '${section.routePath}'::text AS route_path,
        id,
        ${section.titleExpr} AS title,
        ${section.subtitleExpr} AS subtitle,
        ${section.imageExpr} AS image_filename,
        ${section.priceExpr} AS price,
        ${section.quantityExpr} AS quantity,
        (
          CASE WHEN $5::int IS NOT NULL AND id = $5::int THEN 1000 ELSE 0 END +
          CASE WHEN ${boundaryExpr} = $1::text THEN 400 ELSE 0 END +
          CASE
            WHEN ${boundaryExpr} LIKE $3::text
              OR ${boundaryExpr} LIKE ('% ' || $3::text)
            THEN 220
            ELSE 0
          END +
          CASE WHEN ${standardExpr} LIKE $2::text THEN 120 ELSE 0 END +
          CASE
            WHEN $4::text IS NOT NULL AND ${compactExpr} LIKE $4::text THEN 30
            ELSE 0
          END
        )::int AS relevance_score
      FROM ${section.tableName}
      WHERE (
        ${standardExpr} LIKE $2::text
        OR (
          $4::text IS NOT NULL
          AND ${compactExpr} LIKE $4::text
        )
        OR ($5::int IS NOT NULL AND id = $5::int)
      )`
  }).join("\n\n      UNION ALL\n");

  const sql = `
    WITH unified AS (
${unions}
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY table_key
          ORDER BY relevance_score DESC, id ASC
        ) AS section_rank
      FROM unified
    )
    SELECT *
    FROM ranked
    WHERE section_rank <= $6
    ORDER BY
      relevance_score DESC,
      section_rank ASC,
      table_key ASC,
      id ASC
    LIMIT $7
  `;

  let client:
    | {
        query: (
          text: string,
          params?: unknown[]
        ) => Promise<{ rows: UniversalSearchRow[] }>;
        release: () => void;
      }
    | undefined;

  try {
    client = await pool.connect();
    await client.query("SET client_encoding = 'UTF8';");

    const result = await client.query(sql, [
      normalizedQuery,
      escapedLike,
      escapedPrefixLike,
      escapedCompactLike,
      numericQuery,
      perSectionLimit,
      limit,
    ]);

    const items = (result.rows ?? []).map((row) => ({
      tableKey: row.table_key,
      section: row.section_label,
      id: row.id,
      title: row.title ?? `Item #${row.id}`,
      subtitle: row.subtitle ?? null,
      image: row.image_filename ?? null,
      price: row.price ?? null,
      quantity: row.quantity ?? 0,
      href: `${row.route_path}?query=${row.id}&field=id`,
    }));

    return NextResponse.json(
      {
        items,
        total: items.length,
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  } catch (error) {
    console.error("[universal-search] Database error:", error);
    return NextResponse.json(
      { error: "Failed to search inventory" },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
```

## 2) UI Component
Create:
- `components/ui/universal-search.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useNavigationOverlay } from "@/components/navigation-overlay-provider";

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
  const { showOverlay } = useNavigationOverlay();

  const trimmedQuery = query.trim();

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
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to search inventory");
        }

        const data = (await response.json()) as UniversalSearchResponse;
        setResults(Array.isArray(data.items) ? data.items : []);
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
  }, [trimmedQuery]);

  const hasResults = useMemo(() => results.length > 0, [results.length]);

  return (
    <section className="w-full max-w-5xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="universal-inventory-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search all sections by ID, name, category, brand, material..."
          className="h-12 w-full rounded-full border border-border/60 bg-muted/50 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-border/40"
        />
      </div>

      {trimmedQuery ? (
        <div className="mt-3 rounded-2xl border border-border/60 bg-background/70 p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Searching all sections...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">{error}</div>
          ) : hasResults ? (
            <div className="grid max-h-[26rem] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {results.map((item) => (
                <Link
                  key={`${item.tableKey}-${item.id}`}
                  href={item.href}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
                    <p className="text-[11px] text-muted-foreground">Qty: {Math.max(0, item.quantity ?? 0)}</p>
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
```

## 3) Overlay Provider Dependency (required by component)
Create:
- `components/navigation-overlay-provider.tsx`

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Activity,
  useEffectEvent,
  Suspense,
} from "react";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationOverlayContextValue = {
  showOverlay: () => void;
};

const NavigationOverlayContext = createContext<NavigationOverlayContextValue | null>(
  null
);

export function useNavigationOverlay() {
  const context = useContext(NavigationOverlayContext);
  if (context === null) {
    if (typeof window === 'undefined') {
      return {
        showOverlay: () => {
          // No-op during build/SSR
        },
      };
    }
    console.warn('useNavigationOverlay called outside NavigationOverlayProvider');
    return {
      showOverlay: () => {
        // No-op fallback
      },
    };
  }
  return context;
}

function NavigationOverlayProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRouteRef = useRef(`${pathname}?${searchKey}`);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = useEffectEvent(() => {
    clearHideTimer();
    setIsHiding(true);
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsHiding(false);
    }, 300);
  });

  useEffect(() => {
    const routeKey = `${pathname}?${searchKey}`;
    if (lastRouteRef.current !== routeKey) {
      lastRouteRef.current = routeKey;
      if (isVisible) {
        scheduleHide();
      }
    }
    return () => {
      clearHideTimer();
    };
  }, [pathname, searchKey, isVisible]);

  const showOverlay = useCallback(() => {
    clearHideTimer();
    setIsVisible(true);
  }, []);

  const value = useMemo(
    () => ({
      showOverlay,
    }),
    [showOverlay]
  );

  return (
    <NavigationOverlayContext.Provider value={value}>
      {children}
      <Activity mode={isVisible ? "visible" : "hidden"}>
        <NavigationOverlay isHiding={isHiding} />
      </Activity>
    </NavigationOverlayContext.Provider>
  );
}

export function NavigationOverlayProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <NavigationOverlayProviderInner>{children}</NavigationOverlayProviderInner>
    </Suspense>
  );
}

function NavigationOverlay({ isHiding }: { isHiding: boolean }) {
  return (
    <div className={cn(
      "fixed inset-0 z-40 flex items-center justify-center bg-background/95 pointer-events-auto transition-transform duration-300 ease-out",
      isHiding ? "translate-y-full" : "translate-y-0 animate-slide-up"
    )}>
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted/40 border-t-primary" />
        <span className="text-xs uppercase tracking-[0.35em]">Loading</span>
      </div>
    </div>
  );
}
```

## 4) Layout Wiring (required)
In `app/layout.tsx`, wrap your app with:

```tsx
<NavigationOverlayProvider>
  <SiteHeader />
  <main>{children}</main>
</NavigationOverlayProvider>
```

and import:

```tsx
import { NavigationOverlayProvider } from "@/components/navigation-overlay-provider";
```

## 5) Mount the Search UI
In your landing/home page, mount:

```tsx
import { UniversalSearch } from "@/components/ui/universal-search";

<UniversalSearch />
```

## 6) Database Indexes (recommended for exact performance feel)
Run once in Neon DB:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Then create trigram indexes for each searched table expression (standard + compact). Use same expressions as in `SEARCH_SECTIONS`.
