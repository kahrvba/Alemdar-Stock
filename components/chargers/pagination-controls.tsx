"use client";

import Link from "next/link";
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
    return `/chargers${queryString ? `?${queryString}` : ""}`;
  };

  // Generate page numbers to display (Google-style)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2; // Number of pages to show on each side of current page

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const rangeStart = Math.max(2, page - delta);
    const rangeEnd = Math.min(totalPages - 1, page + delta);

    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push("...");
    }

    // Add pages around current page
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pages.push("...");
    }

    // Always show last page (if there's more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      aria-label="Chargers pagination"
      className="flex items-center justify-center gap-2 text-sm"
    >
      {/* Previous Button */}
      {page === 1 ? (
        <span
          aria-disabled={true}
          className="rounded-lg border border-border/40 px-3 py-2 font-medium text-muted-foreground cursor-not-allowed"
        >
          Previous
        </span>
      ) : (
        <Link
          href={buildHref(previousPage)}
          className="rounded-lg border border-border/60 px-3 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted"
          onClick={(e) => handleClick(e, false)}
        >
          Previous
        </Link>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-muted-foreground"
              >
                ...
              </span>
            );
          }

          const pageNumber = pageNum as number;
          const isCurrentPage = pageNumber === page;

          return isCurrentPage ? (
            <span
              key={pageNumber}
              className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground min-w-10 text-center"
            >
              {pageNumber}
            </span>
          ) : (
            <Link
              key={pageNumber}
              href={buildHref(pageNumber)}
              className="rounded-lg border border-border/60 px-3 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted min-w-10 text-center"
              onClick={(e) => handleClick(e, false)}
            >
              {pageNumber}
            </Link>
          );
        })}
      </div>

      {/* Next Button */}
      {page === totalPages ? (
        <span
          aria-disabled={true}
          className="rounded-lg border border-border/40 px-3 py-2 font-medium text-muted-foreground cursor-not-allowed"
        >
          Next
        </span>
      ) : (
        <Link
          href={buildHref(nextPage)}
          className="rounded-lg border border-border/60 px-3 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted"
          onClick={(e) => handleClick(e, false)}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
