import { NextResponse } from "next/server";
import pool from "@/lib/db";

type SectionConfig = {
  key: string;
  label: string;
  tableName: string;
  titleExpr: string;
  baseSearchExpr: string;
};

const SECTION_CONFIG: Record<string, SectionConfig> = {
  arduino: {
    key: "arduino",
    label: "Arduino",
    tableName: "public.arduino",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(category_layer_1, '') || ' ' || COALESCE(category_layer_2, ''))",
  },
  mainled: {
    key: "mainled",
    label: "Cable",
    tableName: "public.mainled",
    titleExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, ''))",
  },
  spray_gum: {
    key: "spray_gum",
    label: "Spray & Gum",
    tableName: "public.spray_gum",
    titleExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, ''))",
  },
  solardb: {
    key: "solardb",
    label: "Solar",
    tableName: "public.solardb",
    titleExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(name, '') || ' ' || COALESCE(rating, '') || ' ' || COALESCE(category, ''))",
  },
  mexxsun: {
    key: "mexxsun",
    label: "Mexxsun",
    tableName: "public.mexxsun",
    titleExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(name, '') || ' ' || COALESCE(rating, '') || ' ' || COALESCE(category, ''))",
  },
  sound: {
    key: "sound",
    label: "Sound",
    tableName: "public.sound",
    titleExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(kodu, ''))",
  },
  batteries: {
    key: "batteries",
    label: "Batteries",
    tableName: "public.batteries",
    titleExpr: "COALESCE(model, CONCAT('Product #', id::text))",
    baseSearchExpr: "LOWER(COALESCE(model, '') || ' ' || COALESCE(volt::text, ''))",
  },
  tv_remotes: {
    key: "tv_remotes",
    label: "TV Remotes",
    tableName: "public.tv_remotes",
    titleExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(name, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(category, ''))",
  },
  filaments: {
    key: "filaments",
    label: "Filaments",
    tableName: "public.filaments",
    titleExpr: "COALESCE(name, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(name, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(material, '') || ' ' || COALESCE(color, '') || ' ' || COALESCE(variant, ''))",
  },
  fans: {
    key: "fans",
    label: "Fans",
    tableName: "public.fans",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, ''))",
  },
  others: {
    key: "others",
    label: "Others",
    tableName: "public.others",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, ''))",
  },
  electric: {
    key: "electric",
    label: "Electric",
    tableName: "public.electric",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, ''))",
  },
  adapters: {
    key: "adapters",
    label: "Adapters",
    tableName: "public.adapters",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, ''))",
  },
  chargers: {
    key: "chargers",
    label: "Chargers",
    tableName: "public.chargers",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, ''))",
  },
  lamps: {
    key: "lamps",
    label: "Lamps",
    tableName: "public.lamps",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    baseSearchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, ''))",
  },
};

const SECTIONS = Object.values(SECTION_CONFIG).map(({ key, label }) => ({ key, label }));
const COMPACT_REGEX = "[[:space:]/_.-]+";
const barcodeColumnSupport = new Map<string, boolean>();

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const splitTableName = (fullName: string) => {
  const [schemaName, tableName] = fullName.split(".");
  return {
    schemaName: schemaName || "public",
    tableName,
  };
};

const checkBarcodeSupport = async (tableName: string) => {
  if (barcodeColumnSupport.has(tableName)) {
    return barcodeColumnSupport.get(tableName) ?? false;
  }

  const { schemaName, tableName: bareTableName } = splitTableName(tableName);
  const result = await pool.query<{ has_barcode: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
          AND column_name = 'barcode'
      ) AS has_barcode
    `,
    [schemaName, bareTableName]
  );
  const hasBarcode = result.rows[0]?.has_barcode ?? false;
  barcodeColumnSupport.set(tableName, hasBarcode);
  return hasBarcode;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section")?.trim() ?? "";
  const query = searchParams.get("query")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 20) : 8;

  if (!section || !SECTION_CONFIG[section]) {
    return NextResponse.json({ error: "Invalid section", sections: SECTIONS }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ items: [], sections: SECTIONS });
  }

  const config = SECTION_CONFIG[section];
  const normalized = query.toLowerCase();
  const compact = normalized.replace(/[ /_.-]+/g, "");
  const numericId = /^\d+$/.test(query) ? Number(query) : null;
  const escapedLike = `%${escapeLike(normalized)}%`;
  const escapedCompactLike = compact ? `%${escapeLike(compact)}%` : null;

  try {
    const hasBarcode = await checkBarcodeSupport(config.tableName);
    const searchExpr = hasBarcode
      ? `(${config.baseSearchExpr} || ' ' || LOWER(COALESCE(barcode, ''))) `
      : config.baseSearchExpr;
    const barcodeExpr = hasBarcode ? "COALESCE(barcode, '')::text" : "''::text";
    const sql = `
      SELECT
        id,
        ${config.titleExpr} AS title,
        ${barcodeExpr} AS barcode
      FROM ${config.tableName}
      WHERE
        ($1::int IS NOT NULL AND id = $1::int)
        OR (${searchExpr} LIKE $2::text)
        OR (
          $3::text IS NOT NULL
          AND REGEXP_REPLACE(${searchExpr}, '${COMPACT_REGEX}', '', 'g') LIKE $3::text
        )
      ORDER BY
        CASE WHEN $1::int IS NOT NULL AND id = $1::int THEN 0 ELSE 1 END,
        id ASC
      LIMIT $4
    `;

    const client = await pool.connect();
    try {
      await client.query("SET client_encoding = 'UTF8';");
      const result = await client.query<{ id: number; title: string | null; barcode: string }>(sql, [
        numericId,
        escapedLike,
        escapedCompactLike,
        limit,
      ]);
      const items = (result.rows ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? `Product #${row.id}`,
        barcode: row.barcode ?? "",
      }));
      return NextResponse.json({ items, sections: SECTIONS });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[fast-barcode][GET] failed:", error);
    return NextResponse.json({ error: "Search failed", sections: SECTIONS }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        section?: string;
        productId?: number;
        barcode?: string;
      }
    | null;

  const section = body?.section?.trim() ?? "";
  const productId = Number(body?.productId);
  const barcode = body?.barcode?.trim() ?? "";

  if (!section || !SECTION_CONFIG[section]) {
    return NextResponse.json({ error: "Invalid section", sections: SECTIONS }, { status: 400 });
  }
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  if (!barcode) {
    return NextResponse.json({ error: "Barcode is required" }, { status: 400 });
  }

  const config = SECTION_CONFIG[section];

  try {
    const hasBarcode = await checkBarcodeSupport(config.tableName);
    if (!hasBarcode) {
      return NextResponse.json(
        { error: `Barcode is not supported for ${config.label}` },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE ${config.tableName}
      SET barcode = $2
      WHERE id = $1
      RETURNING id, ${config.titleExpr} AS title, COALESCE(barcode, '')::text AS barcode
    `;

    const client = await pool.connect();
    try {
      await client.query("SET client_encoding = 'UTF8';");
      const result = await client.query<{ id: number; title: string | null; barcode: string }>(sql, [
        productId,
        barcode,
      ]);
      const row = result.rows[0];
      if (!row) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        item: {
          id: row.id,
          title: row.title ?? `Product #${row.id}`,
          barcode: row.barcode,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[fast-barcode][POST] failed:", error);
    return NextResponse.json({ error: "Failed to update barcode" }, { status: 500 });
  }
}
