import { FocusCards } from "@/components/ui/focus-cards";
import { focusCardsData } from "@/components/ui/focus-cards-demo";
import { QuickNoteButton } from "@/components/ui/quick-note";

export default function Home() {
  return (
    <>
      <main className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-8 font-sans bg-background text-foreground md:px-6">
        <div className="flex w-full max-w-7xl flex-col items-center gap-6">
          <header className="flex flex-col items-center text-center">
            <h1 className="text-3xl font-semibold md:text-4xl">Alemdar Teknik LTD</h1>
          </header>
          <FocusCards cards={focusCardsData} />
        </div>
      </main>
      <QuickNoteButton />
    </>
  );
}
