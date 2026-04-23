export const INVOICE_SOURCE_TABLES = {
  arduino: "public.arduino",
  mainled: "public.mainled",
  solardb: "public.solardb",
  mexxsun: "public.mexxsun",
  sound: "public.sound",
  batteries: "public.batteries",
  tv_remotes: "public.tv_remotes",
  filaments: "public.filaments",
  fans: "public.fans",
  others: "public.others",
  electric: "public.electric",
  adapters: "public.adapters",
  chargers: "public.chargers",
} as const;

export type InvoiceSourceTableKey = keyof typeof INVOICE_SOURCE_TABLES;

export const CART_INVENTORY_TO_SOURCE_TABLE: Record<string, InvoiceSourceTableKey> = {
  arduino: "arduino",
  sound: "sound",
  solar: "solardb",
  mexxsun: "mexxsun",
  cable: "mainled",
  battery: "batteries",
  tv: "tv_remotes",
  filaments: "filaments",
  fans: "fans",
  others: "others",
  electric: "electric",
  adapters: "adapters",
  chargers: "chargers",
};

export function isInvoiceSourceTableKey(value: unknown): value is InvoiceSourceTableKey {
  return typeof value === "string" && value in INVOICE_SOURCE_TABLES;
}
