import { FocusCards } from "@/components/ui/focus-cards";
import { focusCardsData } from "@/components/ui/focus-cards-demo";
import { UniversalSearch } from "@/components/ui/universal-search";
import { QuickSellPanel } from "@/components/quick-sell-panel";

export default function Home() {
  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8 font-sans text-foreground md:px-6">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col items-center gap-6">
            <UniversalSearch />
            <FocusCards cards={focusCardsData} />
          </div>
          <QuickSellPanel />
        </div>
      </main>
    </>
  );
}
