"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  startTransition,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type FilterOption = "id" | "name" | "category" | "rating";

type SolarSearchProps = {
  onFilterChange?: (filters: { query: string; field: FilterOption | null }) => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debounced;
}

export function SolarSearch({
  onFilterChange,
  onLoadingChange,
}: SolarSearchProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const decodeSearchParam = useCallback((value: string | null) => {
    if (!value) {
      return "";
    }
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      return value.replace(/\+/g, " ");
    }
  }, []);

  const initialQuery = decodeSearchParam(searchParams?.get("query"));
  const initialField = (searchParams?.get("field") as FilterOption | null) ?? null;
  const initialUseFieldFilter = initialField !== null;
  
  const [query, setQuery] = useState(initialQuery);
  const [field, setField] = useState<FilterOption | null>(initialField);
  const [useFieldFilter, setUseFieldFilter] = useState(initialUseFieldFilter);
  const [isLoading, setIsLoading] = useState(false);
  const isSyncingFromUrl = useRef(false);
  const searchParamsSnapshot = useRef(searchParams?.toString() ?? "");
  const lastAppliedUrl = useRef<string | null>(null);
  const isUserTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserInteracting = useRef(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const changeLoadingState = useCallback(
    (next: boolean) => {
      setIsLoading(next);
      if (typeof onLoadingChange === "function") {
        onLoadingChange(next);
      }
    },
    [onLoadingChange]
  );

  const stopLoadingIndicator = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    changeLoadingState(false);
  }, [changeLoadingState]);

  const startLoadingIndicator = useCallback(() => {
    changeLoadingState(true);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = setTimeout(() => {
      changeLoadingState(false);
      loadingTimeoutRef.current = null;
    }, 8000);
  }, [changeLoadingState]);

  // Sync state with URL params when they change externally (e.g., browser back/forward)
  // Only sync if the URL change didn't come from our own router.replace call
  useEffect(() => {
    const currentUrl = searchParams?.toString() ?? "";
    
    // If this is the URL we just set, mark it and don't sync
    if (lastAppliedUrl.current === currentUrl) {
      lastAppliedUrl.current = null; // Clear after one check
      stopLoadingIndicator();
      searchParamsSnapshot.current = currentUrl;
      return;
    }

    // If user is actively typing or interacting, don't sync from URL
    if (isUserTyping.current || isUserInteracting.current) {
      searchParamsSnapshot.current = currentUrl;
      return;
    }

    const currentQuery = decodeSearchParam(searchParams?.get("query"));
    const currentField = (searchParams?.get("field") as FilterOption | null) ?? null;
    const currentUseFieldFilter = currentField !== null;

    // Only sync if the URL values are actually different from our current state
    const stateQuery = query.trim();
    const stateField = useFieldFilter ? field : null;
    
    if (currentQuery.trim() !== stateQuery || currentField !== stateField) {
      isSyncingFromUrl.current = true;
      startTransition(() => {
        setQuery(currentQuery);
        setField(currentField);
        setUseFieldFilter(currentUseFieldFilter);
      });
      setTimeout(() => {
        isSyncingFromUrl.current = false;
      }, 0);
    }

    searchParamsSnapshot.current = currentUrl;
    stopLoadingIndicator();
    // We intentionally only react to searchParams changes to avoid fighting local typing state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, stopLoadingIndicator]);

  const updateUrlParams = useCallback(
    (nextQuery: string, nextField: FilterOption | null, activeFieldFilter: boolean) => {
      const params = new URLSearchParams(searchParamsSnapshot.current);
      const normalizedQuery = nextQuery.trim();
      const normalizedField = activeFieldFilter ? nextField : null;
      
      // Update query param
      if (normalizedQuery) {
        params.set("query", normalizedQuery);
      } else {
        params.delete("query");
      }
      
      // Update field param
      if (normalizedField) {
        params.set("field", normalizedField);
      } else {
        params.delete("field");
      }
      
      // Reset to page 1 when filters change
      params.set("page", "1");
      
      const newUrl = params.toString();
      // Mark this URL as one we're applying so we don't sync back from it
      lastAppliedUrl.current = newUrl;

      if (newUrl === searchParamsSnapshot.current) {
        stopLoadingIndicator();
        return;
      }

      // Update URL
      router.replace(`${pathname}?${newUrl}`);
      startLoadingIndicator();
      
      // Call optional callback
      if (typeof onFilterChange === "function") {
        onFilterChange({
          query: normalizedQuery,
          field: normalizedField,
        });
      }
      searchParamsSnapshot.current = newUrl;
    },
    [router, pathname, onFilterChange, startLoadingIndicator, stopLoadingIndicator]
  );

  const debouncedUpdate = useDebouncedCallback(updateUrlParams, 300);

  useEffect(() => {
    // Skip debounced update if we're syncing from URL to prevent infinite loop
    if (!isSyncingFromUrl.current) {
      debouncedUpdate(query, field, useFieldFilter);
    }
  }, [query, field, useFieldFilter, debouncedUpdate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const options = useMemo(
    () => [
      { value: "id", label: "ID" },
      { value: "name", label: "Name" },
      { value: "category", label: "Category" },
      { value: "rating", label: "Rating" },
    ],
    []
  );
  const activeField = useFieldFilter ? field : null;
  const handleFieldSelection = useCallback(
    (nextField: FilterOption | null) => {
      isUserInteracting.current = true;
      if (nextField) {
        setUseFieldFilter(true);
        setField(nextField);
      } else {
        setUseFieldFilter(false);
        setField(null);
      }

      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      interactionTimeoutRef.current = setTimeout(() => {
        isUserInteracting.current = false;
      }, 600);
    },
    []
  );

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search products..."
          value={query}
          onChange={(event) => {
            const newValue = event.target.value;
            setQuery(newValue);
            // Mark that user is typing
            isUserTyping.current = true;
            // Clear any existing timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            // After user stops typing for 500ms, allow URL sync again
            typingTimeoutRef.current = setTimeout(() => {
              isUserTyping.current = false;
            }, 500);
          }}
          onBlur={() => {
            // When input loses focus, allow URL sync immediately
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            isUserTyping.current = false;
          }}
          className="flex-1 rounded-full border border-border/60 bg-muted/50 px-4 py-2 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-border/40"
        />
        {isLoading ? (
          <span className="flex h-8 w-8 items-center justify-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Field Filter
        </span>
        <div className="flex flex-wrap gap-1 text-xs">
          {[{ value: null, label: "All" }, ...options].map((option) => {
            const isActive =
              option.value === null ? activeField === null : activeField === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleFieldSelection(option.value as FilterOption | null)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

