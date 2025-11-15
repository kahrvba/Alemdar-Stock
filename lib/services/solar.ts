export type SolarProduct = {
  id: number;
  name: string | null;
  rating: string | null;
  category: string | null;
  quantity: number | null;
  price: string | null;
  first_price: string | null;
  second_price: string | null;
  third_price: string | null;
  four_price: string | null;
  image_filename: string | null;
  description: string | null;
};

type PaginatedSolarResponse = {
  products?: SolarProduct[];
  items?: SolarProduct[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

export type SolarPagination = {
  items: SolarProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const buildPaginatedResult = (
  data: PaginatedSolarResponse | SolarProduct[],
  fallbackPage: number
): SolarPagination => {
  if (Array.isArray(data)) {
    return {
      items: data,
      page: fallbackPage,
      pageSize: data.length || 1,
      total: data.length,
      totalPages: 1,
    };
  }

  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.products) ? data.products : []);
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

export async function fetchSolarProducts(
  baseUrl: string,
  page: number,
  query?: string | null,
  field?: string | null
): Promise<SolarPagination> {
  const url = new URL("/api/solar", baseUrl);
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
    throw new Error(`Failed to fetch Solar products: ${response.status}`);
  }

  const data = (await response.json()) as
    | PaginatedSolarResponse
    | SolarProduct[];

  return buildPaginatedResult(data, page);
}

