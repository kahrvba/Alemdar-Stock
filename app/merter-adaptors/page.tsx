import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { MerterAdaptorsClient } from "@/components/merter/merter-adaptors-client";

type ScrapedProduct = {
  name: string | null;
  brand: string | null;
  image: string | null;
};

const SCRAPED_DIR = path.join(process.cwd(), "scraped");
const SCRAPED_FILE = path.join(SCRAPED_DIR, "merter-adaptor-products.json");

async function loadProducts(): Promise<ScrapedProduct[]> {
  try {
    const raw = await readFile(SCRAPED_FILE, "utf8");
    const parsed = JSON.parse(raw) as Array<{
      name?: string | null;
      brand?: string | null;
      image?: string | null;
    }>;
    return parsed.map((p) => {
      const name: string | null =
        typeof p.name === "string" ? p.name : p.name === null ? null : null;
      const brand: string | null =
        typeof p.brand === "string" ? p.brand : p.brand === null ? null : null;
      const image: string | null =
        typeof p.image === "string" ? p.image : p.image === null ? null : null;

      return { name, brand, image };
    });
  } catch (err) {
    console.error("[merter-adaptors] Failed to load scraped products:", err);
    return [];
  }
}

async function persistProducts(products: ScrapedProduct[]) {
  await mkdir(SCRAPED_DIR, { recursive: true });
  await writeFile(SCRAPED_FILE, JSON.stringify(products, null, 2), "utf8");
}

export async function deleteProduct(formData: FormData) {
  "use server";

  const indexRaw = formData.get("index");
  if (indexRaw == null || typeof indexRaw !== "string") return;

  const targetIndex = Number.parseInt(indexRaw, 10);
  if (!Number.isFinite(targetIndex) || targetIndex < 0) return;

  const products = await loadProducts();
  const next = products.filter((_, i) => i !== targetIndex);

  await persistProducts(next);
  revalidatePath("/merter-adaptors");
}

export default async function MerterAdaptorsPage() {
  const products = await loadProducts();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Merter Adaptör Scraped Products
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Local JSON only. Deleting here updates{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.8rem]">
                scraped/merter-adaptor-products.json
              </code>{" "}
              on disk.
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-medium">{products.length}</span>
          </span>
        </header>

        <MerterAdaptorsClient products={products} deleteProduct={deleteProduct} />
      </div>
    </main>
  );
}


