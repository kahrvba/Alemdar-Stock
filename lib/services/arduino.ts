export type ArduinoProduct = {
  id: number;
  english_names: string | null;
  turkish_names: string | null;
  category: string | null;
  barcode: string | null;
  quantity: number | null;
  price: string | null;
  image_filename: string | null;
  description: string | null;
};

type PaginatedArduinoResponse = {
  items?: ArduinoProduct[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

export type ArduinoPagination = {
  items: ArduinoProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const buildPaginatedResult = (
  data: PaginatedArduinoResponse | ArduinoProduct[],
  fallbackPage: number
): ArduinoPagination => {
  if (Array.isArray(data)) {
    return {
      items: data,
      page: fallbackPage,
      pageSize: data.length || 1,
      total: data.length,
      totalPages: 1,
    };
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const page =
    typeof data.page === "number" && data.page > 0 ? data.page : fallbackPage;
  const pageSize =
    typeof data.pageSize === "number" && data.pageSize > 0
      ? data.pageSize
      : items.length || 1;
  const total =
    typeof data.total === "number" && data.total >= 0
      ? data.total
      : items.length;
  const computedTotalPages =
    typeof data.totalPages === "number" && data.totalPages > 0
      ? data.totalPages
      : Math.max(1, Math.ceil((total || 1) / (pageSize || 1)));

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: computedTotalPages,
  };
};

export async function fetchArduinoProducts(
  baseUrl: string,
  page: number,
  query?: string | null,
  field?: string | null
): Promise<ArduinoPagination> {
  const url = new URL("/api/arduino", baseUrl);
  url.searchParams.set("page", Math.max(1, page).toString());

  if (query?.trim()) {
    url.searchParams.set("query", query.trim());
  }

  if (field) {
    url.searchParams.set("field", field);
  }

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Arduino products: ${response.status}`);
  }

  const data = (await response.json()) as
    | PaginatedArduinoResponse
    | ArduinoProduct[];

  return buildPaginatedResult(data, page);
}

