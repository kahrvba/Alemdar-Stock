BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.lamps (
  id integer PRIMARY KEY,
  english_names text,
  turkish_names text,
  category text,
  barcode text,
  quantity integer DEFAULT 0,
  price text,
  image_filename text,
  description text
);

CREATE SEQUENCE IF NOT EXISTS public.lamps_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.lamps_id_seq OWNED BY public.lamps.id;

ALTER TABLE public.lamps
  ALTER COLUMN id SET DEFAULT nextval('public.lamps_id_seq');

SELECT setval(
  'public.lamps_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM public.lamps), 0), 1),
  COALESCE((SELECT MAX(id) FROM public.lamps), 0) > 0
);

CREATE INDEX IF NOT EXISTS idx_lamps_universal_search_trgm
ON public.lamps
USING gin (LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_lamps_universal_search_compact_trgm
ON public.lamps
USING gin (REGEXP_REPLACE(LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '')), '[[:space:]/_.-]+', '', 'g') gin_trgm_ops);

COMMIT;
