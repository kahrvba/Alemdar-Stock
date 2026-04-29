ALTER TABLE public.electric ADD COLUMN IF NOT EXISTS barcode varchar;
ALTER TABLE public.filaments ADD COLUMN IF NOT EXISTS barcode varchar;
ALTER TABLE public.tv_remotes ADD COLUMN IF NOT EXISTS barcode varchar;
