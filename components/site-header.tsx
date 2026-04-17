"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartButton } from "@/components/ui/cart";
import StaggeredMenu from "@/components/StaggeredMenu";
import { useNavigationOverlay } from "@/components/navigation-overlay-provider";
import type { DeploymentVersion } from "@/lib/app-version";

type SiteHeaderProps = {
  initialVersion: DeploymentVersion;
};

export function SiteHeader({ initialVersion }: SiteHeaderProps) {
  const menuItems = [
    { label: "Arduino", ariaLabel: "Arduino Section", link: "/arduino" },
    { label: "Adapters", ariaLabel: "Adapters Section", link: "/adapters" },
    { label: "Batteries", ariaLabel: "Batteries Section", link: "/batteries" },
    { label: "Cable", ariaLabel: "Cable Section", link: "/cable" },
    { label: "Chargers", ariaLabel: "Chargers Section", link: "/chargers" },
    { label: "Sound", ariaLabel: "Sound Section", link: "/sound" },
    { label: "Solar", ariaLabel: "Solar Section", link: "/solar" },
    { label: "Mexxsun", ariaLabel: "Mexxsun Section", link: "/mexxsun" },
    { label: "Fans", ariaLabel: "Fans Section", link: "/fans" },
    { label: "Electric", ariaLabel: "Electric Section", link: "/electric" },
    { label: "Others", ariaLabel: "Others Section", link: "/others" },
    { label: "Invoices", ariaLabel: "Invoices Section", link: "/invoices" },
  ];

  const { showOverlay } = useNavigationOverlay();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <CartButton />
            <ThemeToggle />
          </div>
          <Link
            href="/"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              showOverlay();
            }}
            className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground transition hover:text-foreground"
          >
            {`VERSION ${initialVersion.appVersion}`}
          </Link>
        </div>
      </header>
      <StaggeredMenu
        position="right"
        items={menuItems}
        displaySocials={false}
        isFixed={true}
        logoUrl=""
        menuButtonColor="hsl(var(--foreground))"
        openMenuButtonColor="hsl(var(--foreground))"
        accentColor="hsl(var(--primary))"
        changeMenuColorOnOpen={false}
      />
    </>
  );
}
