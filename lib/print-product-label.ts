type UnknownRecord = Record<string, unknown>;

const PRINT_ROTATION_DEGREES = 180;

const asText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const firstNonEmpty = (product: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = asText(product[key]);
    if (value) return value;
  }
  return "";
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatPrice = (value: string) => {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return "$0.00";
  return `$${numeric.toFixed(2)}`;
};

const parsePriceNumber = (value: string) => {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
};

const buildPrintableProduct = (product: UnknownRecord) => {
  const id = firstNonEmpty(product, ["id"]);
  const name = firstNonEmpty(product, ["english_names", "english_name", "name", "model"]) || `Product #${id || "0"}`;
  const barcode = firstNonEmpty(product, ["barcode", "kodu"]) || id || "0";
  const rawPrice = firstNonEmpty(product, ["selling_price", "price"]);
  const cashPriceNumber = parsePriceNumber(rawPrice);
  const cardPriceNumber = cashPriceNumber * 1.16;
  const cashPrice = formatPrice(rawPrice);
  const cardPrice = `$${cardPriceNumber.toFixed(2)}`;

  return {
    id,
    barcode,
    cashPrice,
    cardPrice,
    name,
  };
};

export function printProductLabel(product: UnknownRecord) {
  if (typeof window === "undefined") return;

  const printable = buildPrintableProduct(product);
  const barcodeSrc = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    printable.barcode
  )}&scale=2&height=11&includetext=false`;
  const popup = window.open("", "_blank", "width=520,height=420");

  if (!popup) {
    window.alert("Could not open print window.");
    return;
  }

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Print Label</title>
      <style>
        @page { size: 60mm 30mm; margin: 0; }
        html, body {
          margin: 0;
          padding: 0;
          width: 60mm;
          height: 30mm;
          font-family: Arial, sans-serif;
          background: #fff;
          color: #111;
        }
        .sheet {
          box-sizing: border-box;
          position: relative;
          width: 60mm;
          height: 30mm;
          overflow: hidden;
          transform: rotate(${PRINT_ROTATION_DEGREES}deg);
          transform-origin: center center;
        }
        .name {
          margin: 0;
          position: absolute;
          left: 0.8mm;
          top: 0.6mm;
          right: 0.8mm;
          height: 9mm;
          font-size: 3.7mm;
          line-height: 1.02;
          font-weight: 700;
          overflow: hidden;
          word-break: break-word;
        }
        .barcode {
          position: absolute;
          left: 0.8mm;
          top: 10.8mm;
          width: 28mm;
          max-width: 28mm;
          height: 10.8mm;
          object-fit: fill;
        }
        .barcode-value {
          margin-top: 0;
          position: absolute;
          left: 0.8mm;
          top: 22.1mm;
          width: 28mm;
          text-align: center;
          font-size: 3.95mm;
          font-weight: 700;
          letter-spacing: 0.06mm;
          white-space: nowrap;
          overflow: hidden;
        }
        .price {
          position: absolute;
          right: 0.8mm;
          top: 10.7mm;
          width: 24mm;
          text-align: right;
          font-size: 4.2mm;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }
        .price-card {
          position: absolute;
          right: 0.8mm;
          top: 15.3mm;
          width: 24mm;
          text-align: right;
          font-size: 4.2mm;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }
        .number {
          position: absolute;
          right: 0.8mm;
          top: 20.8mm;
          width: 24mm;
          text-align: right;
          font-size: 5.5mm;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <section class="sheet">
        <div class="name">${escapeHtml(printable.name)}</div>
        <img id="barcode" class="barcode" src="${barcodeSrc}" alt="Barcode" />
        <div class="barcode-value">${escapeHtml(printable.barcode)}</div>
        <div class="price">${escapeHtml(`${printable.cashPrice} (cash)`)}</div>
        <div class="price-card">${escapeHtml(`${printable.cardPrice} (card)`)}</div>
        <div class="number">${escapeHtml(`No ${printable.id}`)}</div>
      </section>
      <script>
        const barcode = document.getElementById("barcode");
        const printNow = () => {
          window.focus();
          window.print();
        };
        barcode?.addEventListener("load", () => setTimeout(printNow, 60), { once: true });
        barcode?.addEventListener("error", () => setTimeout(printNow, 60), { once: true });
        window.addEventListener("afterprint", () => window.close(), { once: true });
        setTimeout(printNow, 1200);
      </script>
    </body>
  </html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
