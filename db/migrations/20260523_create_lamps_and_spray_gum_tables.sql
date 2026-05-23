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

CREATE INDEX IF NOT EXISTS idx_lamps_search_trgm
ON public.lamps
USING gin (
  LOWER(
    COALESCE(english_names, '') || ' ' ||
    COALESCE(turkish_names, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    COALESCE(barcode, '')
  ) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_lamps_search_compact_trgm
ON public.lamps
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

CREATE TABLE IF NOT EXISTS public.spray_gum (
  id integer PRIMARY KEY,
  english_name text,
  turkish_name text,
  category text,
  barcode text,
  quantity integer DEFAULT 0,
  price text,
  image_filename text,
  description text
);

CREATE SEQUENCE IF NOT EXISTS public.spray_gum_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.spray_gum_id_seq OWNED BY public.spray_gum.id;

ALTER TABLE public.spray_gum
  ALTER COLUMN id SET DEFAULT nextval('public.spray_gum_id_seq');

SELECT setval(
  'public.spray_gum_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM public.spray_gum), 0), 1),
  COALESCE((SELECT MAX(id) FROM public.spray_gum), 0) > 0
);

CREATE INDEX IF NOT EXISTS idx_spray_gum_search_trgm
ON public.spray_gum
USING gin (
  LOWER(
    COALESCE(english_name, '') || ' ' ||
    COALESCE(turkish_name, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    COALESCE(barcode, '')
  ) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_spray_gum_search_compact_trgm
ON public.spray_gum
USING gin (
  REGEXP_REPLACE(
    LOWER(
      COALESCE(english_name, '') || ' ' ||
      COALESCE(turkish_name, '') || ' ' ||
      COALESCE(category, '') || ' ' ||
      COALESCE(barcode, '')
    ),
    '[[:space:]/_.-]+',
    '',
    'g'
  ) gin_trgm_ops
);

COMMIT;
