import { headers } from "next/headers";
import { fetchBatteryProducts, type BatteryPagination } from "@/lib/services/batteries";
import { BatteriesInventoryClient } from "@/components/batteries/battery-inventory-client";


export default async function BatteriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; field?: string }>;
}) {
  let responseData: BatteryPagination | null = null;
  const headerList = await headers();
  const forwardedProto = headerList.get("x-forwarded-proto");
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = headerList.get("host") ?? "localhost:3000";

  const resolvedParams = await searchParams;
  const currentPage =
    resolvedParams?.page && Number(resolvedParams.page) > 0
      ? Math.floor(Number(resolvedParams.page))
      : 1;
  const query = resolvedParams?.query ?? null;
  const field = resolvedParams?.field ?? null;

  const requestOrigin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : `http://${host}`;

  const apiBaseUrl =
    requestOrigin || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  try {
    responseData = await fetchBatteryProducts(apiBaseUrl, currentPage, query, field);
  } catch (error) {
    console.error("[batteries/page] fetch error:", error);
    responseData = {
      items: [],
      page: 1,
      pageSize: 1,
      total: 0,
      totalPages: 1,
    };
  }

  const items = responseData?.items ?? [];
  const totalPages = Math.max(1, responseData?.totalPages ?? 1);
  const page = Math.min(totalPages, Math.max(1, responseData?.page ?? currentPage));

  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <BatteriesInventoryClient
          items={items}
          page={page}
          totalPages={totalPages}
          previousPage={previousPage}
          nextPage={nextPage}
          query={query}
          field={field}
        />
      </div>
    </main>
  );
}
