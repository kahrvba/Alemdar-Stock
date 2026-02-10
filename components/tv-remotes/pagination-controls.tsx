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

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    isDisabled: boolean
  ) => {
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
    return `/tv-remotes${queryString ? `?${queryString}` : ""}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2;

    pages.push(1);

    const rangeStart = Math.max(2, page - delta);
    const rangeEnd = Math.min(totalPages - 1, page + delta);

    if (rangeStart > 2) {
      pages.push("...");
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < totalPages - 1) {
      pages.push("...");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      aria-label="TV remotes pagination"
      className="flex items-center justify-center gap-2 text-sm"
    >
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
              className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground min-w-[40px] text-center"
            >
              {pageNumber}
            </span>
          ) : (
            <Link
              key={pageNumber}
              href={buildHref(pageNumber)}
              className="rounded-lg border border-border/60 px-3 py-2 font-medium text-foreground transition hover:border-border hover:bg-muted min-w-[40px] text-center"
              onClick={(e) => handleClick(e, false)}
            >
              {pageNumber}
            </Link>
          );
        })}
      </div>

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
