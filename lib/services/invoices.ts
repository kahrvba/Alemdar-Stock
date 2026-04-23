import pool from '@/lib/db';
import { unstable_noStore as noStore } from "next/cache";

export interface Invoice {
  id: number;
  invoice_number: string;
  date_created: string;
  total_amount: number;
  status?: string;
  undone_at?: string | null;
  undoable?: boolean;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  noStore();
  const client = await pool.connect();
  try {
    const result = await client.query(
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
    return result.rows.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      date_created: row.date_created,
      total_amount: Number(row.total_amount) || 0,
      status: row.status,
      undone_at: row.undone_at ?? null,
      undoable: row.undoable === true,
    }));
  } finally {
    client.release();
  }
}
