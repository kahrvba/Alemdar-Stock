"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNavigationOverlay } from "@/components/navigation-overlay-provider";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  query?: string | null;
  field?: string | null;
};

export function PaginationControls({
  page,
  totalPages,
  previousPage,
  nextPage,
  query,
  field,
}: PaginationControlsProps) {
  const { showOverlay } = useNavigationOverlay();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    showOverlay();
  };

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", targetPage.toString());
    if (query?.trim()) {
      params.set("query", query.trim());
    }
    if (field) {
      params.set("field", field);
    }
    const queryString = params.toString();
    return `/arduino${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <nav
      aria-label="Arduino pagination"
      className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
    >
      <Link
        href={buildHref(previousPage)}
        aria-disabled={page === 1}
        className={cn(
          "rounded-full border border-border/60 px-4 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted",
          page === 1
            ? "cursor-not-allowed border-border/40 text-muted-foreground"
            : ""
        )}
        onClick={handleClick}
      >
        Previous
      </Link>
      <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(nextPage)}
        aria-disabled={page === totalPages}
        className={cn(
          "rounded-full border border-border/60 px-4 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted",
          page === totalPages
            ? "cursor-not-allowed border-border/40 text-muted-foreground"
            : ""
        )}
        onClick={handleClick}
      >
        Next
      </Link>
    </nav>
  );
}

