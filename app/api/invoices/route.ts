import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isInvoiceSourceTableKey } from "@/lib/invoice-undo";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const KDV_RATE = 0.16;

// POST: Create a new invoice and its items
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceNumber, date, products, total } = body;

    // Validate required fields
    if (!invoiceNumber || !date || !Array.isArray(products) || products.length === 0 || typeof total !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid required fields.' }, { status: 400 });
    }

    // Validate invoice number format
    if (typeof invoiceNumber !== 'string' || invoiceNumber.trim() === '') {
      return NextResponse.json({ error: 'Invalid invoice number.' }, { status: 400 });
    }

    // Validate date format
    if (typeof date !== 'string' || isNaN(Date.parse(date))) {
      return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
    }

    // Validate total is positive when provided by clients
    if (typeof total === "number" && total < 0) {
      return NextResponse.json({ error: 'Total amount must be positive.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET client_encoding = 'UTF8';");
      let computedSubtotal = 0;
      
      // Insert invoice
      const invoiceRes = await client.query(
        `INSERT INTO public.invoices (invoice_number, date_created, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [invoiceNumber.trim(), date, total, 'completed']
      );
      const invoiceId = invoiceRes.rows[0].id;
      
      // Insert invoice items
      for (const p of products) {
        if (
          !p.name ||
          typeof p.quantity !== 'number' ||
          typeof p.unitPrice !== 'number' ||
          typeof p.total !== 'number' ||
          !isInvoiceSourceTableKey(p.sourceTableKey)
        ) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Invalid product data in invoice.' }, { status: 400 });
        }
        
        // Validate product data
        if (p.quantity <= 0 || p.unitPrice < 0 || p.total < 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Invalid product quantity or price.' }, { status: 400 });
        }
        
        await client.query(
          `INSERT INTO public.invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, barcode, source_table_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            invoiceId,
            p.productId || null,
            p.name.trim(),
            p.quantity,
            p.unitPrice,
            p.total,
            p.barcode ? String(p.barcode).trim() : null,
            p.sourceTableKey,
          ]
        );
        computedSubtotal += p.total;
      }
      const computedGrandTotal = computedSubtotal + computedSubtotal * KDV_RATE;

      await client.query(
        `UPDATE public.invoices
         SET total_amount = $2
         WHERE id = $1`,
        [invoiceId, computedGrandTotal]
      );
      await client.query('COMMIT');
      return NextResponse.json({ success: true, invoiceId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[invoices] SQL error:', err instanceof Error ? err.message : 'Unknown error');
      return NextResponse.json({ error: 'Failed to save invoice' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[invoices] Request error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// GET: List all invoices (optimized - no items needed for listing)
export async function GET() {
  const client = await pool.connect();
  try {
    await client.query("SET client_encoding = 'UTF8';");
    // Only fetch invoice data, not items (items are only needed for detail view)
    const invoicesRes = await client.query(
      `SELECT
         i.id,
         i.invoice_number,
         i.date_created,
         i.total_amount,
         i.status,
         i.undone_at,
         CASE
           WHEN COALESCE(i.status, 'completed') = 'completed'
            AND EXISTS (
              SELECT 1
              FROM public.invoice_items ii
              WHERE ii.invoice_id = i.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM public.invoice_items ii
              WHERE ii.invoice_id = i.id
                AND (ii.source_table_key IS NULL OR ii.source_table_key = '')
            )
           THEN TRUE
           ELSE FALSE
         END AS undoable
       FROM public.invoices i
       ORDER BY i.id DESC, i.date_created DESC`
    );
    return NextResponse.json(
      { invoices: invoicesRes.rows },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error('[invoices] GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  } finally {
    client.release();
  }
} 
