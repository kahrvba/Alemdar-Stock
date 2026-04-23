import { NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  INVOICE_SOURCE_TABLES,
  isInvoiceSourceTableKey,
  type InvoiceSourceTableKey,
} from "@/lib/invoice-undo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type InvoiceRow = {
  id: number;
  status: string | null;
  undone_at: string | null;
};

type InvoiceItemRow = {
  id: number;
  product_id: number | null;
  quantity: number | string;
  source_table_key: string | null;
};

export async function POST(_req: Request, context: RouteContext) {
  const params = await context.params;
  const invoiceId = Number.parseInt(params.id, 10);

  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET client_encoding = 'UTF8';");

    const invoiceRes = await client.query<InvoiceRow>(
      `SELECT id, status, undone_at
       FROM public.invoices
       WHERE id = $1
       FOR UPDATE`,
      [invoiceId]
    );

    const invoice = invoiceRes.rows[0];
    if (!invoice) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Invoice not found", errorCode: "NOT_FOUND" }, { status: 404 });
    }

    if (invoice.status === "canceled" || invoice.undone_at) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Invoice already undone", errorCode: "ALREADY_UNDONE", invoiceId },
        { status: 409 }
      );
    }

    const itemsRes = await client.query<InvoiceItemRow>(
      `SELECT id, product_id, quantity, source_table_key
       FROM public.invoice_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [invoiceId]
    );

    if (itemsRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Invoice has no items", errorCode: "EMPTY_INVOICE", invoiceId },
        { status: 409 }
      );
    }

    const parsedItems: Array<{
      sourceTableKey: InvoiceSourceTableKey;
      productId: number;
      quantity: number;
    }> = [];

    for (const row of itemsRes.rows) {
      if (!isInvoiceSourceTableKey(row.source_table_key)) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "Undo unavailable for legacy invoice",
            errorCode: "LEGACY_INVOICE_UNDO_UNAVAILABLE",
            invoiceId,
          },
          { status: 409 }
        );
      }

      const productId = Number(row.product_id);
      const quantity = Number(row.quantity);

      if (!Number.isFinite(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "Undo unavailable due to invalid invoice item data",
            errorCode: "INVALID_INVOICE_ITEM",
            invoiceId,
          },
          { status: 409 }
        );
      }

      parsedItems.push({
        sourceTableKey: row.source_table_key,
        productId,
        quantity,
      });
    }

    for (const item of parsedItems) {
      const tableName = INVOICE_SOURCE_TABLES[item.sourceTableKey];
      const restoreResult = await client.query(
        `UPDATE ${tableName}
         SET quantity = COALESCE(quantity, 0) + $2
         WHERE id = $1
         RETURNING id`,
        [item.productId, item.quantity]
      );

      if (restoreResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "Undo failed because one or more products no longer exist",
            errorCode: "PRODUCT_NOT_FOUND",
            invoiceId,
          },
          { status: 409 }
        );
      }
    }

    const updateRes = await client.query<{ status: string; undone_at: string | null }>(
      `UPDATE public.invoices
       SET status = 'canceled', undone_at = NOW()
       WHERE id = $1
       RETURNING status, undone_at`,
      [invoiceId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      invoiceId,
      status: updateRes.rows[0]?.status ?? "canceled",
      undoneAt: updateRes.rows[0]?.undone_at ?? null,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[invoices/[id]/undo] failed:", error);
    return NextResponse.json({ error: "Failed to undo invoice" }, { status: 500 });
  } finally {
    client.release();
  }
}
