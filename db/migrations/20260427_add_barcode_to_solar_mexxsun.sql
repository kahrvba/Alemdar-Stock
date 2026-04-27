ALTER TABLE public.solardb
ADD COLUMN IF NOT EXISTS barcode varchar;

ALTER TABLE public.mexxsun
ADD COLUMN IF NOT EXISTS barcode varchar;
