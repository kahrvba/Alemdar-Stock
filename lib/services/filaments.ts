export type FilamentProduct = {
  id: number;
  name: string;
  brand: string;
  material: string;
  barcode: string | null;
  variant: string | null;
  color: string;
  net_weight_kg: number;
  diameter_mm: number;
  quantity: number | null;
  price: number | string | null;
  image_filename: string | null;
};

type PaginatedFilamentResponse = {
  items?: FilamentProduct[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

export type FilamentPagination = {
  items: FilamentProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const buildPaginatedResult = (
  data: PaginatedFilamentResponse | FilamentProduct[],
  fallbackPage: number
): FilamentPagination => {
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

export async function fetchFilamentProducts(
  baseUrl: string,
  page: number,
  query?: string | null,
  field?: string | null
): Promise<FilamentPagination> {
  const url = new URL("/api/filaments", baseUrl);
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
    throw new Error(`Failed to fetch filaments: ${response.status}`);
  }

  const data = (await response.json()) as PaginatedFilamentResponse | FilamentProduct[];

  return buildPaginatedResult(data, page);
}
