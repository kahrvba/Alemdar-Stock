export async function generateUniqueBarcode(): Promise<string> {
  const response = await fetch("/api/tools/generate-barcode", {
    method: "POST",
  });

  const data = (await response.json().catch(() => null)) as
    | { barcode?: string; error?: string }
    | null;

  if (!response.ok || !data?.barcode) {
    throw new Error(data?.error || "Failed to generate barcode");
  }

  return data.barcode;
}
