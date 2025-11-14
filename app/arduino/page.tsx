import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fetchArduinoProducts, type ArduinoPagination } from "@/lib/services/arduino";
import { ArduinoInventoryClient } from "@/components/arduino/arduino-inventory-client";

export default async function ArduinoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; field?: string }>;
}) {
  let responseData: ArduinoPagination | null = null;
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
    responseData = await fetchArduinoProducts(apiBaseUrl, currentPage, query, field);
  } catch (error) {
    console.error("[arduino/page] fetch error:", error);
    return notFound();
  }

  const items = responseData?.items ?? [];
  const totalPages = responseData?.totalPages ?? 1;
  const page = responseData?.page ?? currentPage;

  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <ArduinoInventoryClient
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

