import { FocusCards } from "@/components/ui/focus-cards";
import { focusCardsData } from "@/components/ui/focus-cards-demo";
import { UniversalSearch } from "@/components/ui/universal-search";
import { QuickSellPanel } from "@/components/quick-sell-panel";
import { TodayTotalPanel } from "@/components/today-total-panel";
import Link from "next/link";
import { Printer } from "lucide-react";

export default function Home() {
  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8 font-sans text-foreground md:px-6">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col items-center gap-6">
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-foreground">
                <Link
                  href="/tzt-order"
                  className="inline-flex items-center gap-2 bg-foreground px-3 py-2 text-background no-underline transition hover:opacity-90"
                >
                  <Printer className="size-4" aria-hidden="true" />
                  TZT Order Print
                </Link>
                <Link
                  href="/tools"
                  className="underline underline-offset-4 transition hover:opacity-80"
                >
                  Fast Barcode Inserter
                </Link>
                <Link
                  href="/tools?tool=product"
                  className="underline underline-offset-4 transition hover:opacity-80"
                >
                  Fast Product Inserter
                </Link>
                <a
                  href="https://projecthub.alemdarteknik.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 transition hover:opacity-80"
                >
                  Project Hub
                </a>
                <a
                  href="https://alemdarteknik.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 transition hover:opacity-80"
                >
                  Main website
                </a>
              </div>
            </div>
            <UniversalSearch />
            <FocusCards cards={focusCardsData} />
          </div>
          <div className="flex flex-col gap-16">
            <QuickSellPanel />
            <TodayTotalPanel />
          </div>
        </div>
      </main>
    </>
  );
}
