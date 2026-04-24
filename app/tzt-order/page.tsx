import { TztOrderClient } from "@/components/tzt-order/tzt-order-client";
import { loadTztOrderProducts } from "@/lib/tzt-order-matches";

export default async function TztOrderPage() {
  const products = await loadTztOrderProducts();

  return <TztOrderClient products={products} />;
}
