type UnknownRecord = Record<string, unknown>;

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

const splitName = (value: string, maxLineLength = 24) => {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return ["Item", ""];
  const words = text.split(" ");
  const lines = ["", ""];

  for (const word of words) {
    if (!lines[0]) {
      lines[0] = word;
      continue;
    }
    if (`${lines[0]} ${word}`.length <= maxLineLength) {
      lines[0] = `${lines[0]} ${word}`;
      continue;
    }
    if (!lines[1]) {
      lines[1] = word;
      continue;
    }
    if (`${lines[1]} ${word}`.length <= maxLineLength) {
      lines[1] = `${lines[1]} ${word}`;
      continue;
    }
    lines[1] = `${lines[1].slice(0, Math.max(0, maxLineLength - 1))}...`;
    break;
  }

  return [lines[0] || "Item", lines[1] || ""];
};

const buildPrintableProduct = (product: UnknownRecord) => {
  const id = firstNonEmpty(product, ["id"]);
  const name = firstNonEmpty(product, ["english_names", "english_name", "name", "model"]) || `Product #${id || "0"}`;
  const barcode = firstNonEmpty(product, ["barcode", "kodu"]) || id || "0";
  const price = formatPrice(firstNonEmpty(product, ["selling_price", "price"]));
  const [nameLine1, nameLine2] = splitName(name);

  return {
    id,
    barcode,
    price,
    nameLine1,
    nameLine2,
  };
};

export function printProductLabel(product: UnknownRecord) {
  if (typeof window === "undefined") return;

  const printable = buildPrintableProduct(product);
  const barcodeSrc = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    printable.barcode
  )}&scale=2&height=8&includetext=false`;
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
          width: 60mm;
          height: 30mm;
          padding: 1.4mm 0.8mm 1.2mm 2.4mm;
          display: grid;
          grid-template-columns: 34.5mm 17.5mm;
          grid-template-rows: 9mm 8.4mm 4.5mm;
          column-gap: 1.4mm;
          row-gap: 0.3mm;
          overflow: hidden;
        }
        .name {
          margin: 0;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          font-size: 2.95mm;
          line-height: 1.1;
          font-weight: 700;
          max-height: 8.6mm;
          overflow: hidden;
        }
        .barcode {
          grid-column: 1 / 2;
          grid-row: 2 / 3;
          width: 34.5mm;
          max-width: 34.5mm;
          height: 8.4mm;
          object-fit: fill;
        }
        .barcode-value {
          margin-top: 0;
          grid-column: 1 / 2;
          grid-row: 3 / 4;
          width: 34.5mm;
          text-align: center;
          font-size: 3.1mm;
          font-weight: 700;
          letter-spacing: 0.1mm;
          white-space: nowrap;
          overflow: hidden;
        }
        .price {
          grid-column: 2 / 3;
          grid-row: 2 / 3;
          align-self: start;
          justify-self: end;
          text-align: right;
          font-size: 4.4mm;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }
        .number {
          grid-column: 2 / 3;
          grid-row: 3 / 4;
          align-self: start;
          justify-self: end;
          text-align: right;
          font-size: 4.4mm;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <section class="sheet">
        <div class="name">${escapeHtml(printable.nameLine1)}${
          printable.nameLine2 ? `<br />${escapeHtml(printable.nameLine2)}` : ""
        }</div>
        <img id="barcode" class="barcode" src="${barcodeSrc}" alt="Barcode" />
        <div class="barcode-value">${escapeHtml(printable.barcode)}</div>
        <div class="price">${escapeHtml(printable.price)}</div>
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
