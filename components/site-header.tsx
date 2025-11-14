"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNavigationOverlay } from "@/components/navigation-overlay-provider";
import { CartButton } from "@/components/ui/cart";

export function SiteHeader() {
  const { showOverlay } = useNavigationOverlay();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            showOverlay();
          }}
          className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground transition hover:text-foreground"
        >
          Alemdar Teknik LTD
        </Link>
        <div className="flex items-center gap-3">
          <CartButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

