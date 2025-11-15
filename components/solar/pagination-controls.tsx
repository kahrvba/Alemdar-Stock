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

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, isDisabled: boolean) => {
    if (isDisabled || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      event.preventDefault();
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
    return `/solar${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <nav
      aria-label="Solar pagination"
      className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
    >
      {page === 1 ? (
        <span
          aria-disabled={true}
          className="rounded-full border border-border/40 px-4 py-2 font-medium text-muted-foreground cursor-not-allowed"
        >
          Previous
        </span>
      ) : (
        <Link
          href={buildHref(previousPage)}
          className="rounded-full border border-border/60 px-4 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted"
          onClick={(e) => handleClick(e, false)}
        >
          Previous
        </Link>
      )}
      <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {page === totalPages ? (
        <span
          aria-disabled={true}
          className="rounded-full border border-border/40 px-4 py-2 font-medium text-muted-foreground cursor-not-allowed"
        >
          Next
        </span>
      ) : (
        <Link
          href={buildHref(nextPage)}
          className="rounded-full border border-border/60 px-4 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted"
          onClick={(e) => handleClick(e, false)}
        >
          Next
        </Link>
      )}
    </nav>
  );
}

