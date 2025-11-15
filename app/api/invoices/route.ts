import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST: Create a new invoice and its items
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received invoice POST body:', body);
    const { invoiceNumber, date, products, subtotal, total } = body;

    // Validate required fields
    if (!invoiceNumber || !date || !Array.isArray(products) || products.length === 0 || typeof total !== 'number') {
      console.error('Validation failed:', { invoiceNumber, date, products, total });
      return NextResponse.json({ error: 'Missing or invalid required fields.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Insert invoice
      const invoiceRes = await client.query(
        `INSERT INTO public.invoices (invoice_number, date_created, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [invoiceNumber, date, total, 'completed']
      );
      const invoiceId = invoiceRes.rows[0].id;
      // Insert invoice items
      for (const p of products) {
        if (!p.name || typeof p.quantity !== 'number' || typeof p.unitPrice !== 'number' || typeof p.total !== 'number') {
          console.error('Invalid product in invoice:', p);
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Invalid product data in invoice.' }, { status: 400 });
        }
        await client.query(
          `INSERT INTO public.invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, barcode)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoiceId,
            p.productId || null,
            p.name,
            p.quantity,
            p.unitPrice,
            p.total,
            p.barcode || null,
          ]
        );
      }
      await client.query('COMMIT');
      return NextResponse.json({ success: true, invoiceId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('SQL error in invoice POST:', err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: 'Failed to save invoice', details: message }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('General error in invoice POST:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
  }
}

// GET: List all invoices (optimized - no items needed for listing)
export async function GET() {
  try {
    const client = await pool.connect();
    // Only fetch invoice data, not items (items are only needed for detail view)
    const invoicesRes = await client.query(
      'SELECT id, invoice_number, date_created, total_amount, status FROM public.invoices ORDER BY date_created DESC'
    );
    const invoices = invoicesRes.rows;
    client.release();
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error in GET /api/invoices:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch invoices', details: message }, { status: 500 });
  }
} 