import { NextResponse } from "next/server";
import pool from "@/lib/db";

const FILAMENT_SEARCH_FIELDS = ["id", "name", "brand", "material", "color"] as const;
type FilamentSearchField = (typeof FILAMENT_SEARCH_FIELDS)[number];

const COMPACT_REGEX = "[[:space:]/_.-]+";
const FILAMENT_SEARCHABLE_EXPR =
  "LOWER(COALESCE(name, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(material, '') || ' ' || COALESCE(color, '') || ' ' || COALESCE(variant, ''))";
const FILAMENT_SEARCHABLE_COMPACT_EXPR =
  `REGEXP_REPLACE(${FILAMENT_SEARCHABLE_EXPR}, '${COMPACT_REGEX}', '', 'g')`;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
const toCompact = (value: string) => value.replace(/[ /_.-]+/g, "");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  const field = searchParams.get("field");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");

  const page = Number.isFinite(Number(pageParam)) && Number(pageParam) > 0
    ? Math.floor(Number(pageParam))
    : 1;
  const pageSizeRaw = Number.isFinite(Number(pageSizeParam)) && Number(pageSizeParam) > 0
    ? Math.floor(Number(pageSizeParam))
    : 24;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 60);

  try {
    const client = await pool.connect();
    await client.query("SET client_encoding = 'UTF8';");

    let items = [];
    let total = 0;
    let currentPage = page;
    const currentPageSize = pageSize;

    const values: unknown[] = [];
    let whereClause = "";

    if (query) {
      const normalizedQuery = query.toLowerCase();
      const escapedLike = `%${escapeLike(normalizedQuery)}%`;
      const compactQuery = toCompact(normalizedQuery);
      const escapedCompactLike = compactQuery ? `%${escapeLike(compactQuery)}%` : null;
      const numericQuery = /^\d+$/.test(query) ? Number(query) : null;

      if (field && FILAMENT_SEARCH_FIELDS.includes(field as FilamentSearchField)) {
        if (field === "id") {
          values.push(numericQuery);
          whereClause = "WHERE ($1::int IS NOT NULL AND id = $1::int)";
        } else {
          const fieldExpr = `LOWER(COALESCE(${field}, ''))`;
          const compactFieldExpr = `REGEXP_REPLACE(${fieldExpr}, '${COMPACT_REGEX}', '', 'g')`;
          values.push(escapedLike, escapedCompactLike);
          whereClause = `WHERE (
            ${fieldExpr} LIKE $1::text
            OR ($2::text IS NOT NULL AND ${compactFieldExpr} LIKE $2::text)
          )`;
        }
      } else {
        values.push(escapedLike, escapedCompactLike, numericQuery);
        whereClause = `WHERE (
          ${FILAMENT_SEARCHABLE_EXPR} LIKE $1::text OR
          ($2::text IS NOT NULL AND ${FILAMENT_SEARCHABLE_COMPACT_EXPR} LIKE $2::text) OR
          ($3::int IS NOT NULL AND id = $3::int)
        )`;
      }
    }

    const totalResult = await client.query(
      `SELECT COUNT(*) FROM public.filaments ${whereClause}`,
      values
    );
    total = Number(totalResult.rows[0]?.count ?? 0);

    const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const offset = (currentPage - 1) * currentPageSize;
    const result = await client.query(
      `SELECT id, name, brand, material, variant, color, net_weight_kg, diameter_mm,
              COALESCE(quantity, 0) as quantity, price, image_filename
       FROM public.filaments ${whereClause}
       ORDER BY id ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, currentPageSize, offset]
    );
    items = result.rows ?? [];

    client.release();

    return NextResponse.json({
      items,
      page: currentPage,
      pageSize: currentPageSize,
      total,
      totalPages: Math.max(1, Math.ceil((total || 1) / currentPageSize)),
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to fetch filaments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const { name, brand, material, variant, color, net_weight_kg, diameter_mm, quantity, price, image_filename } = await req.json();

    if (!name || !brand || !material || !color) {
      return NextResponse.json({ error: "Name, brand, material, and color are required" }, { status: 400 });
    }

    const result = await client.query(
      `INSERT INTO public.filaments
       (name, brand, material, variant, color, net_weight_kg, diameter_mm, quantity, price, image_filename)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        name,
        brand,
        material,
        variant ?? null,
        color,
        net_weight_kg ?? 1,
        diameter_mm ?? 1.75,
        typeof quantity === "number" ? quantity : null,
        price ?? null,
        image_filename ?? null,
      ]
    );

    return NextResponse.json({ id: result.rows[0]?.id }, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to add filament" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(req: Request) {
  const client = await pool.connect();
  try {
    const { id, name, brand, material, variant, color, net_weight_kg, diameter_mm, quantity, price, image_filename } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const result = await client.query(
      `UPDATE public.filaments
       SET
         name = COALESCE($1, name),
         brand = COALESCE($2, brand),
         material = COALESCE($3, material),
         variant = COALESCE($4, variant),
         color = COALESCE($5, color),
         net_weight_kg = COALESCE($6, net_weight_kg),
         diameter_mm = COALESCE($7, diameter_mm),
         quantity = COALESCE($8, quantity),
         price = COALESCE($9, price),
         image_filename = COALESCE($10, image_filename)
       WHERE id = $11`,
      [
        name,
        brand,
        material,
        variant,
        color,
        net_weight_kg,
        diameter_mm,
        quantity,
        price,
        image_filename,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to update filament" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request) {
  const client = await pool.connect();
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const result = await client.query("DELETE FROM public.filaments WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to delete filament" }, { status: 500 });
  } finally {
    client.release();
  }
}
