import { FastBarcodeInserter } from "@/components/tools/fast-barcode-inserter";
import { FastProductInserter } from "@/components/tools/fast-product-inserter";

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  const params = await searchParams;
  const activeTool = params?.tool === "product" ? "product" : "barcode";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8 text-foreground md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-3xl border border-border/60 bg-card/80">
          <div className="p-4">
            {activeTool === "product" ? <FastProductInserter /> : <FastBarcodeInserter />}
          </div>
        </section>
      </div>
    </main>
  );
}
