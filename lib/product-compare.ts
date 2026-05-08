export type ComparableProduct = {
  id: string;
  name: string;
  price: string;
  barcode: string;
  category: string;
  quantity: string;
  image: string;
  source: string;
};

const EVENT_NAME = "product-compare:add";

const asText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const firstNonEmpty = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = asText(record[key]);
    if (value) return value;
  }
  return "";
};

const formatUsd = (raw: string) => {
  const numeric = Number(raw.replace(/[^\d.,-]/g, "").replace(",", "."));
  if (!Number.isFinite(numeric)) return "$0.00";
  return `$${numeric.toFixed(2)}`;
};

export const toComparableProduct = (
  product: Record<string, unknown>,
  sourceHint?: string
): ComparableProduct => {
  const id = firstNonEmpty(product, ["id"]) || "-";
  const name =
    firstNonEmpty(product, [
      "english_names",
      "english_name",
      "name",
      "model",
      "brand",
    ]) || `Product #${id}`;
  const priceRaw = firstNonEmpty(product, [
    "selling_price",
    "price",
    "wholesale_price",
    "min_selling_price",
  ]);
  const barcode = firstNonEmpty(product, ["barcode", "kodu"]) || "-";
  const category =
    firstNonEmpty(product, ["category", "material", "type", "brand"]) || "-";
  const quantity = firstNonEmpty(product, ["quantity", "stock", "amount"]) || "0";
  const image = firstNonEmpty(product, ["image_filename", "image", "image_url"]);
  const source =
    firstNonEmpty(product, ["source_table_key"]) ||
    asText(sourceHint) ||
    "inventory";

  return {
    id,
    name,
    price: formatUsd(priceRaw),
    barcode,
    category,
    quantity,
    image,
    source,
  };
};

export const addProductToCompare = (product: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  const comparable = toComparableProduct(product, window.location.pathname);
  window.dispatchEvent(new CustomEvent<ComparableProduct>(EVENT_NAME, { detail: comparable }));
};

export const PRODUCT_COMPARE_EVENT = EVENT_NAME;
