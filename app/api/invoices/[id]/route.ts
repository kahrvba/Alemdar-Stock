import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/invoices/[id]
export async function GET(req: Request, context: any) {
  const params = await context.params;
  const invoiceId = params.id;
  console.log('Requested invoiceId:', invoiceId); // Debug log
  if (!invoiceId) {
    return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 });
  }
  
  // Parse invoice ID as integer
  const invoiceIdNum = parseInt(invoiceId, 10);
  if (isNaN(invoiceIdNum)) {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }
  
  try {
    const client = await pool.connect();
    // Fetch invoice
    const invoiceRes = await client.query(
      'SELECT * FROM public.invoices WHERE id = $1',
      [invoiceIdNum]
    );
    console.log('Invoice query result:', invoiceRes.rows); // Debug log
    if (invoiceRes.rows.length === 0) {
      client.release();
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceRes.rows[0];
    // Fetch items
    const itemsRes = await client.query(
      'SELECT * FROM public.invoice_items WHERE invoice_id = $1',
      [invoiceIdNum]
    );
    console.log('Invoice items query result:', itemsRes.rows); // Debug log
    client.release();
    // Format for InvoiceTemplate
    function formatDate(dateString: string) {
      if (!dateString) return '';
      const d = new Date(dateString);
      // Format: YYYY-MM-DD HH:mm:ss
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    const products = itemsRes.rows.map((item: any) => ({
      name: item.product_name,
      barcode: item.barcode || '',
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      total: Number(item.total_price),
    }));
    return NextResponse.json({
      invoiceNumber: invoice.invoice_number,
      date: formatDate(invoice.date_created),
      products,
      subtotal: products.reduce((sum: number, p: any) => sum + p.total, 0),
      total: Number(invoice.total_amount),
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
} 