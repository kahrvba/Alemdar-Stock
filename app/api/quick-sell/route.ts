import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { InvoiceSourceTableKey } from "@/lib/invoice-undo";

type TableConfig = {
  tableKey: InvoiceSourceTableKey;
  sectionLabel: string;
  tableName: string;
  nameExpr: string;
  barcodeExpr: string;
  priceExpr: string;
  codeMatchExpr: string;
};

const TABLE_CONFIG: Record<string, TableConfig> = {
  arduino: {
    tableKey: "arduino",
    sectionLabel: "Arduino",
    tableName: "public.arduino",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  mainled: {
    tableKey: "mainled",
    sectionLabel: "Cable",
    tableName: "public.mainled",
    nameExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  solardb: {
    tableKey: "solardb",
    sectionLabel: "Solar",
    tableName: "public.solardb",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "selling_price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  mexxsun: {
    tableKey: "mexxsun",
    sectionLabel: "Mexxsun",
    tableName: "public.mexxsun",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "selling_price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  sound: {
    tableKey: "sound",
    sectionLabel: "Sound",
    tableName: "public.sound",
    nameExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3 OR LOWER(COALESCE(kodu::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(kodu::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  batteries: {
    tableKey: "batteries",
    sectionLabel: "Batteries",
    tableName: "public.batteries",
    nameExpr: "COALESCE(model, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  tv_remotes: {
    tableKey: "tv_remotes",
    sectionLabel: "TV Remotes",
    tableName: "public.tv_remotes",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  filaments: {
    tableKey: "filaments",
    sectionLabel: "Filaments",
    tableName: "public.filaments",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  fans: {
    tableKey: "fans",
    sectionLabel: "Fans",
    tableName: "public.fans",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  others: {
    tableKey: "others",
    sectionLabel: "Others",
    tableName: "public.others",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  electric: {
    tableKey: "electric",
    sectionLabel: "Electric",
    tableName: "public.electric",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  adapters: {
    tableKey: "adapters",
    sectionLabel: "Adapters",
    tableName: "public.adapters",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
  chargers: {
    tableKey: "chargers",
    sectionLabel: "Chargers",
    tableName: "public.chargers",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
    codeMatchExpr:
      "(LOWER(COALESCE(barcode::text, '')) = $4 OR LOWER(REGEXP_REPLACE(COALESCE(barcode::text, ''), '[ /_.-]+', '', 'g')) = $3)",
  },
};

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const KDV_RATE = 0.16;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim() ?? "";

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const numericCandidate = /^\d+$/.test(code) ? Number(code) : NaN;
  const isIdCandidate =
    Number.isSafeInteger(numericCandidate) &&
    numericCandidate > 0 &&
    numericCandidate <= 2147483647 &&
    String(numericCandidate) === code;
  const normalizedCode = code.toLowerCase().replace(/[ /_.-]+/g, "");

  const unionSql = Object.values(TABLE_CONFIG)
    .map((config) => {
      return `
        SELECT
          '${config.tableKey}'::text AS table_key,
          '${config.sectionLabel}'::text AS section,
          id,
          ${config.nameExpr} AS title,
          ${config.priceExpr}::text AS price,
          COALESCE(quantity, 0)::int AS quantity,
          CASE
            WHEN $2::boolean IS TRUE AND id = $1::int THEN 2
            WHEN ${config.codeMatchExpr} THEN 1
            ELSE 0
          END AS match_rank
        FROM ${config.tableName}
        WHERE
          (($2::boolean IS TRUE AND id = $1::int) OR ${config.codeMatchExpr})
      `;
    })
    .join("\nUNION ALL\n");

  const sql = `
    WITH matched AS (
      ${unionSql}
    )
    SELECT table_key, section, id, title, price, quantity
    FROM matched
    ORDER BY match_rank DESC, quantity DESC, id ASC
    LIMIT 1
  `;

  const params = [isIdCandidate ? numericCandidate : null, isIdCandidate, normalizedCode, code.toLowerCase()];

  try {
    const result = await pool.query<{
      table_key: string;
      section: string;
      id: number;
      title: string;
      price: string | null;
      quantity: number;
    }>(sql, params);

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ found: false, error: "Product not available" }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      item: {
        tableKey: row.table_key,
        section: row.section,
        id: row.id,
        title: row.title ?? `Product #${row.id}`,
        price: row.price,
        quantity: row.quantity ?? 0,
      },
    });
  } catch (error) {
    console.error("[quick-sell] resolve failed:", error);
    return NextResponse.json({ found: false, error: "Product lookup failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        tableKey?: string;
        productId?: number;
        quantity?: number;
        items?: Array<{
          tableKey?: string;
          productId?: number;
          quantity?: number;
        }>;
      }
    | null;

  const rawItems =
    Array.isArray(body?.items) && body?.items.length > 0
      ? body.items
      : [
          {
            tableKey: body?.tableKey,
            productId: body?.productId,
            quantity: body?.quantity,
          },
        ];

  const mergedByKey = new Map<
    string,
    {
      tableKey: string;
      productId: number;
      quantity: number;
    }
  >();

  for (const entry of rawItems) {
    const tableKey = entry?.tableKey?.trim() ?? "";
    const productId = Number(entry?.productId);
    const quantity = Math.max(1, Number(entry?.quantity ?? 1));

    if (!tableKey || !Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ error: "Invalid quick sell payload" }, { status: 400 });
    }

    const config = TABLE_CONFIG[tableKey];
    if (!config) {
      return NextResponse.json({ error: "Unsupported inventory table" }, { status: 400 });
    }

    const key = `${tableKey}:${productId}`;
    const existing = mergedByKey.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      mergedByKey.set(key, { tableKey, productId, quantity });
    }
  }

  const items = Array.from(mergedByKey.values());
  if (items.length === 0) {
    return NextResponse.json({ error: "No items to sell" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET client_encoding = 'UTF8';");

    const verifiedLines: Array<{
      tableKey: string;
      productId: number;
      quantity: number;
      newStock: number;
      productName: string;
      barcode: string | null;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    for (const item of items) {
      const config = TABLE_CONFIG[item.tableKey];
      const selectSql = `
        SELECT
          id,
          COALESCE(quantity, 0) AS quantity,
          ${config.nameExpr} AS product_name,
          ${config.barcodeExpr} AS barcode,
          ${config.priceExpr} AS unit_price
        FROM ${config.tableName}
        WHERE id = $1
        FOR UPDATE
      `;

      const productRes = await client.query<{
        id: number;
        quantity: number;
        product_name: string | null;
        barcode: string | null;
        unit_price: string | number | null;
      }>(selectSql, [item.productId]);

      const product = productRes.rows[0];
      if (!product) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const currentStock = Number(product.quantity) || 0;
      if (currentStock < item.quantity) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "stock finished",
            productId: item.productId,
            tableKey: item.tableKey,
            available: currentStock,
          },
          { status: 409 }
        );
      }

      const newStock = currentStock - item.quantity;
      const unitPrice = toFiniteNumber(product.unit_price);
      const lineTotal = unitPrice * item.quantity;

      verifiedLines.push({
        tableKey: item.tableKey,
        productId: item.productId,
        quantity: item.quantity,
        newStock,
        productName: product.product_name ?? `Product #${item.productId}`,
        barcode: product.barcode,
        unitPrice,
        lineTotal,
      });
    }

    for (const line of verifiedLines) {
      const config = TABLE_CONFIG[line.tableKey];
      await client.query(`UPDATE ${config.tableName} SET quantity = $2 WHERE id = $1`, [
        line.productId,
        line.newStock,
      ]);
    }

    const latestInvoiceRes = await client.query<{ invoice_number: string }>(
      "SELECT invoice_number FROM public.invoices ORDER BY id DESC LIMIT 1"
    );
    const latestInvoiceValue = latestInvoiceRes.rows[0]?.invoice_number ?? "0";
    const latestInvoiceNumber = Number.parseInt(String(latestInvoiceValue), 10) || 0;
    const nextInvoiceNumber = latestInvoiceNumber + 1;
    const subtotalAmount = verifiedLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalAmount = subtotalAmount + subtotalAmount * KDV_RATE;

    const invoiceRes = await client.query<{ id: number }>(
      `INSERT INTO public.invoices (invoice_number, date_created, total_amount, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [String(nextInvoiceNumber), new Date().toISOString(), totalAmount, "completed"]
    );

    const invoiceId = invoiceRes.rows[0]?.id;
    if (!invoiceId) {
      throw new Error("Failed to create invoice id");
    }

    for (const line of verifiedLines) {
      await client.query(
        `INSERT INTO public.invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, barcode, source_table_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          invoiceId,
          line.productId,
          line.productName,
          line.quantity,
          line.unitPrice,
          line.lineTotal,
          line.barcode,
          line.tableKey,
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      invoiceId,
      soldCount: verifiedLines.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[quick-sell] failed:", error);
    return NextResponse.json({ error: "Quick sell failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        tableKey?: string;
        productId?: number;
      }
    | null;

  const tableKey = body?.tableKey?.trim() ?? "";
  const productId = Number(body?.productId);

  if (!tableKey || !Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid quick sell payload" }, { status: 400 });
  }

  const config = TABLE_CONFIG[tableKey];
  if (!config) {
    return NextResponse.json({ error: "Unsupported inventory table" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET client_encoding = 'UTF8';");

    const productRes = await client.query<{ id: number; quantity: number }>(
      `SELECT id, COALESCE(quantity, 0) AS quantity
       FROM ${config.tableName}
       WHERE id = $1
       FOR UPDATE`,
      [productId]
    );

    const product = productRes.rows[0];
    if (!product) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const previousQuantity = Number(product.quantity) || 0;
    const nextQuantity = previousQuantity === 0 ? 1 : previousQuantity;

    if (nextQuantity !== previousQuantity) {
      await client.query(`UPDATE ${config.tableName} SET quantity = $2 WHERE id = $1`, [
        productId,
        nextQuantity,
      ]);
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      tableKey,
      productId,
      previousQuantity,
      quantity: nextQuantity,
      fixed: nextQuantity > previousQuantity,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[quick-sell] fix stock failed:", error);
    return NextResponse.json({ error: "Failed to fix stock" }, { status: 500 });
  } finally {
    client.release();
  }
}
