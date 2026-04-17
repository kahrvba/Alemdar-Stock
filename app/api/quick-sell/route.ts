import { NextResponse } from "next/server";
import pool from "@/lib/db";

type TableConfig = {
  tableName: string;
  nameExpr: string;
  barcodeExpr: string;
  priceExpr: string;
};

const TABLE_CONFIG: Record<string, TableConfig> = {
  arduino: {
    tableName: "public.arduino",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
  },
  mainled: {
    tableName: "public.mainled",
    nameExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
  },
  solardb: {
    tableName: "public.solardb",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "selling_price",
  },
  mexxsun: {
    tableName: "public.mexxsun",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "selling_price",
  },
  sound: {
    tableName: "public.sound",
    nameExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
  },
  batteries: {
    tableName: "public.batteries",
    nameExpr: "COALESCE(model, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "price",
  },
  tv_remotes: {
    tableName: "public.tv_remotes",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "price",
  },
  filaments: {
    tableName: "public.filaments",
    nameExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "price",
  },
  fans: {
    tableName: "public.fans",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
  },
  others: {
    tableName: "public.others",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "barcode",
    priceExpr: "price",
  },
  electric: {
    tableName: "public.electric",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "price",
  },
  adapters: {
    tableName: "public.adapters",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "price",
  },
  chargers: {
    tableName: "public.chargers",
    nameExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    barcodeExpr: "NULL",
    priceExpr: "price",
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

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        tableKey?: string;
        productId?: number;
        quantity?: number;
      }
    | null;

  const tableKey = body?.tableKey?.trim() ?? "";
  const productId = Number(body?.productId);
  const quantity = Math.max(1, Number(body?.quantity ?? 1));

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
    }>(selectSql, [productId]);

    const product = productRes.rows[0];
    if (!product) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentStock = Number(product.quantity) || 0;
    if (currentStock < quantity) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Not enough stock", available: currentStock },
        { status: 409 }
      );
    }

    const newStock = currentStock - quantity;
    const unitPrice = toFiniteNumber(product.unit_price);
    const lineTotal = unitPrice * quantity;

    await client.query(`UPDATE ${config.tableName} SET quantity = $2 WHERE id = $1`, [
      productId,
      newStock,
    ]);

    const latestInvoiceRes = await client.query<{ invoice_number: string }>(
      "SELECT invoice_number FROM public.invoices ORDER BY id DESC LIMIT 1"
    );
    const latestInvoiceValue = latestInvoiceRes.rows[0]?.invoice_number ?? "0";
    const latestInvoiceNumber = Number.parseInt(String(latestInvoiceValue), 10) || 0;
    const nextInvoiceNumber = latestInvoiceNumber + 1;

    const invoiceRes = await client.query<{ id: number }>(
      `INSERT INTO public.invoices (invoice_number, date_created, total_amount, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [String(nextInvoiceNumber), new Date().toISOString(), lineTotal, "completed"]
    );

    const invoiceId = invoiceRes.rows[0]?.id;
    if (!invoiceId) {
      throw new Error("Failed to create invoice id");
    }

    await client.query(
      `INSERT INTO public.invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, barcode)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        invoiceId,
        productId,
        product.product_name ?? `Product #${productId}`,
        quantity,
        unitPrice,
        lineTotal,
        product.barcode,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      invoiceId,
      remainingQuantity: newStock,
      soldQuantity: quantity,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[quick-sell] failed:", error);
    return NextResponse.json({ error: "Quick sell failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
