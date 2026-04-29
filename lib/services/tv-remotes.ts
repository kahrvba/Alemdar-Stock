export type TvRemote = {
  id: number;
  name: string;
  brand: string;
  category: string;
  barcode: string | null;
  description: string | null;
  specs: Record<string, unknown>;
  image_filename: string | null;
  quantity: number | null;
  price: number | string | null;
};

type PaginatedTvRemoteResponse = {
  items?: TvRemote[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

export type TvRemotePagination = {
  items: TvRemote[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const buildPaginatedResult = (
  data: PaginatedTvRemoteResponse | TvRemote[],
  fallbackPage: number
): TvRemotePagination => {
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

export async function fetchTvRemoteProducts(
  baseUrl: string,
  page: number,
  query?: string | null,
  field?: string | null
): Promise<TvRemotePagination> {
  const url = new URL("/api/tv-remotes", baseUrl);
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
    throw new Error(`Failed to fetch TV remotes: ${response.status}`);
  }

  const data = (await response.json()) as PaginatedTvRemoteResponse | TvRemote[];

  return buildPaginatedResult(data, page);
}
