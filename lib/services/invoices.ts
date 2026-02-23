import pool from '@/lib/db';
import { unstable_noStore as noStore } from "next/cache";

export interface Invoice {
  id: number;
  invoice_number: string;
  date_created: string;
  total_amount: number;
  status?: string;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  noStore();
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, invoice_number, date_created, total_amount, status FROM public.invoices ORDER BY id DESC, date_created DESC'
    );
    return result.rows.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      date_created: row.date_created,
      total_amount: Number(row.total_amount) || 0,
      status: row.status,
    }));
  } finally {
    client.release();
  }
}
