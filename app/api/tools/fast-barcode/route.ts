import { NextResponse } from "next/server";
import pool from "@/lib/db";

type SectionConfig = {
  key: string;
  label: string;
  tableName: string;
  titleExpr: string;
  searchExpr: string;
};

const SECTION_CONFIG: Record<string, SectionConfig> = {
  arduino: {
    key: "arduino",
    label: "Arduino",
    tableName: "public.arduino",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    searchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(category_layer_1, '') || ' ' || COALESCE(category_layer_2, '') || ' ' || COALESCE(barcode, ''))",
  },
  mainled: {
    key: "mainled",
    label: "Cable",
    tableName: "public.mainled",
    titleExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    searchExpr:
      "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))",
  },
  sound: {
    key: "sound",
    label: "Sound",
    tableName: "public.sound",
    titleExpr: "COALESCE(english_name, turkish_name, CONCAT('Product #', id::text))",
    searchExpr:
      "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, '') || ' ' || COALESCE(kodu, ''))",
  },
  batteries: {
    key: "batteries",
    label: "Batteries",
    tableName: "public.batteries",
    titleExpr: "COALESCE(model, CONCAT('Product #', id::text))",
    searchExpr:
      "LOWER(COALESCE(model, '') || ' ' || COALESCE(volt::text, '') || ' ' || COALESCE(barcode, ''))",
  },
  fans: {
    key: "fans",
    label: "Fans",
    tableName: "public.fans",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    searchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))",
  },
  others: {
    key: "others",
    label: "Others",
    tableName: "public.others",
    titleExpr: "COALESCE(english_names, turkish_names, CONCAT('Product #', id::text))",
    searchExpr:
      "LOWER(COALESCE(english_names, '') || ' ' || COALESCE(turkish_names, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))",
  },
};

const SECTIONS = Object.values(SECTION_CONFIG).map(({ key, label }) => ({ key, label }));
const COMPACT_REGEX = "[[:space:]/_.-]+";

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

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

  const sql = `
    SELECT
      id,
      ${config.titleExpr} AS title,
      COALESCE(barcode, '')::text AS barcode
    FROM ${config.tableName}
    WHERE
      ($1::int IS NOT NULL AND id = $1::int)
      OR (${config.searchExpr} LIKE $2::text)
      OR (
        $3::text IS NOT NULL
        AND REGEXP_REPLACE(${config.searchExpr}, '${COMPACT_REGEX}', '', 'g') LIKE $3::text
      )
    ORDER BY
      CASE WHEN $1::int IS NOT NULL AND id = $1::int THEN 0 ELSE 1 END,
      id ASC
    LIMIT $4
  `;

  try {
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
  const sql = `
    UPDATE ${config.tableName}
    SET barcode = $2
    WHERE id = $1
    RETURNING id, ${config.titleExpr} AS title, COALESCE(barcode, '')::text AS barcode
  `;

  try {
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

