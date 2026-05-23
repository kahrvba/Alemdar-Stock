BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.scrawesdriver (
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

CREATE SEQUENCE IF NOT EXISTS public.scrawesdriver_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.scrawesdriver_id_seq OWNED BY public.scrawesdriver.id;

ALTER TABLE public.scrawesdriver
  ALTER COLUMN id SET DEFAULT nextval('public.scrawesdriver_id_seq');

SELECT setval(
  'public.scrawesdriver_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM public.scrawesdriver), 0), 1),
  COALESCE((SELECT MAX(id) FROM public.scrawesdriver), 0) > 0
);

CREATE INDEX IF NOT EXISTS idx_scrawesdriver_search_trgm
ON public.scrawesdriver
USING gin (
  LOWER(
    COALESCE(english_names, '') || ' ' ||
    COALESCE(turkish_names, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    COALESCE(barcode, '')
  ) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_scrawesdriver_search_compact_trgm
ON public.scrawesdriver
USING gin (
  REGEXP_REPLACE(
    LOWER(
      COALESCE(english_names, '') || ' ' ||
      COALESCE(turkish_names, '') || ' ' ||
      COALESCE(category, '') || ' ' ||
      COALESCE(barcode, '')
    ),
    '[[:space:]/_.-]+',
    '',
    'g'
  ) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_scrawesdriver_id ON public.scrawesdriver USING btree (id);
CREATE INDEX IF NOT EXISTS idx_scrawesdriver_id_covering ON public.scrawesdriver USING btree (id) INCLUDE (english_names, image_filename, category, quantity, price, description);
CREATE INDEX IF NOT EXISTS idx_scrawesdriver_category ON public.scrawesdriver USING btree (category) WHERE category IS NOT NULL AND category <> '';
CREATE INDEX IF NOT EXISTS idx_scrawesdriver_category_trim ON public.scrawesdriver USING btree (TRIM(BOTH FROM category)) WHERE category IS NOT NULL AND TRIM(BOTH FROM category) <> '';

COMMIT;
