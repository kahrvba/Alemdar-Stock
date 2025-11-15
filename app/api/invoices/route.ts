import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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

    // Validate total is positive
    if (total < 0) {
      return NextResponse.json({ error: 'Total amount must be positive.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET client_encoding = 'UTF8';");
      
      // Insert invoice
      const invoiceRes = await client.query(
        `INSERT INTO public.invoices (invoice_number, date_created, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [invoiceNumber.trim(), date, total, 'completed']
      );
      const invoiceId = invoiceRes.rows[0].id;
      
      // Insert invoice items
      for (const p of products) {
        if (!p.name || typeof p.quantity !== 'number' || typeof p.unitPrice !== 'number' || typeof p.total !== 'number') {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Invalid product data in invoice.' }, { status: 400 });
        }
        
        // Validate product data
        if (p.quantity <= 0 || p.unitPrice < 0 || p.total < 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Invalid product quantity or price.' }, { status: 400 });
        }
        
        await client.query(
          `INSERT INTO public.invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, barcode)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoiceId,
            p.productId || null,
            p.name.trim(),
            p.quantity,
            p.unitPrice,
            p.total,
            p.barcode ? String(p.barcode).trim() : null,
          ]
        );
      }
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
      'SELECT id, invoice_number, date_created, total_amount, status FROM public.invoices ORDER BY date_created DESC'
    );
    return NextResponse.json({ invoices: invoicesRes.rows });
  } catch (error) {
    console.error('[invoices] GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  } finally {
    client.release();
  }
} 