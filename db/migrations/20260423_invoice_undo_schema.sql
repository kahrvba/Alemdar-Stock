ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS source_table_key character varying;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS undone_at timestamp without time zone;

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id_source_table_key
  ON public.invoice_items(invoice_id, source_table_key);

CREATE INDEX IF NOT EXISTS idx_invoices_status_undone_at
  ON public.invoices(status, undone_at);
