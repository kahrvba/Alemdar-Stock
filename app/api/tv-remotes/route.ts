import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { normalizeImageFilename } from "@/lib/image-path";

const TV_SEARCH_FIELDS = ["id", "name", "brand", "category", "barcode"] as const;
type TvSearchField = (typeof TV_SEARCH_FIELDS)[number];

const COMPACT_REGEX = "[[:space:]/_.-]+";
const TV_SEARCHABLE_EXPR =
  "LOWER(COALESCE(name, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))";
const TV_SEARCHABLE_COMPACT_EXPR =
  `REGEXP_REPLACE(${TV_SEARCHABLE_EXPR}, '${COMPACT_REGEX}', '', 'g')`;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
const toCompact = (value: string) => value.replace(/[ /_.-]+/g, "");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode");
  const query = searchParams.get("query")?.trim();
  const field = searchParams.get("field");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const all = searchParams.get("all") === "true";
  const id = searchParams.get("id");
  const idsParam = searchParams.get("ids");

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

    const ids = idsParam
      ? Array.from(
          new Set(
            idsParam
              .split(",")
              .map((value) => Number(value.trim()))
              .filter((value) => Number.isFinite(value) && value > 0)
          )
        )
      : [];

    if (ids.length > 0) {
      const result = await client.query(
        `SELECT id, name, brand, category, barcode, description, specs, image_filename, COALESCE(quantity, 0) as quantity, price
         FROM public.tv_remotes
         WHERE id = ANY($1)
         ORDER BY id ASC`,
        [ids]
      );
      client.release();
      return NextResponse.json({ items: result.rows });
    }

    if (id) {
      const result = await client.query(
        `SELECT id, name, brand, category, barcode, description, specs, image_filename, COALESCE(quantity, 0) as quantity, price
         FROM public.tv_remotes
         WHERE id = $1`,
        [id]
      );
      client.release();
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    }

    if (all) {
      const result = await client.query(
        `SELECT id, name, brand, category, barcode, description, specs, image_filename, COALESCE(quantity, 0) as quantity, price
         FROM public.tv_remotes
         ORDER BY id ASC`
      );
      const totalResult = await client.query("SELECT COUNT(*) FROM public.tv_remotes");
      client.release();
      return NextResponse.json({
        products: result.rows,
        total: parseInt(totalResult.rows[0].count, 10),
      });
    }

    if (barcode) {
      const result = await client.query(
        `SELECT id, name, brand, category, barcode, description, specs, image_filename, COALESCE(quantity, 0) as quantity, price
         FROM public.tv_remotes
         WHERE barcode = $1
         ORDER BY id ASC`,
        [barcode]
      );
      items = result.rows ?? [];
      total = items.length;
      currentPage = 1;
      const forcedPageSize = total || currentPageSize;
      client.release();
      return NextResponse.json({
        items,
        page: currentPage,
        pageSize: forcedPageSize,
        total,
        totalPages: Math.max(1, Math.ceil((total || 1) / forcedPageSize)),
      });
    }

    const values: unknown[] = [];
    let whereClause = "";

    if (query) {
      const normalizedQuery = query.toLowerCase();
      const escapedLike = `%${escapeLike(normalizedQuery)}%`;
      const compactQuery = toCompact(normalizedQuery);
      const escapedCompactLike = compactQuery ? `%${escapeLike(compactQuery)}%` : null;
      const numericQuery = /^\d+$/.test(query) ? Number(query) : null;

      if (field && TV_SEARCH_FIELDS.includes(field as TvSearchField)) {
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
          ${TV_SEARCHABLE_EXPR} LIKE $1::text OR
          ($2::text IS NOT NULL AND ${TV_SEARCHABLE_COMPACT_EXPR} LIKE $2::text) OR
          ($3::int IS NOT NULL AND id = $3::int)
        )`;
      }
    }

    const totalResult = await client.query(
      `SELECT COUNT(*) FROM public.tv_remotes ${whereClause}`,
      values
    );
    total = Number(totalResult.rows[0]?.count ?? 0);

    const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const offset = (currentPage - 1) * currentPageSize;
    const result = await client.query(
      `SELECT id, name, brand, category, barcode, description, specs, image_filename, COALESCE(quantity, 0) as quantity, price
       FROM public.tv_remotes ${whereClause}
       ORDER BY id ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, currentPageSize, offset]
    );
    items = result.rows ?? [];

    client.release();

    const responseBody = {
      items,
      page: currentPage,
      pageSize: currentPageSize,
      total,
      totalPages: Math.max(1, Math.ceil((total || 1) / currentPageSize)),
    };

    return NextResponse.json(responseBody, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TV remotes" },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const { name, brand, category, barcode, description, specs, image_filename, quantity, price } = await req.json();

    if (!name || !brand || !category) {
      return NextResponse.json({ error: "Name, brand, and category are required" }, { status: 400 });
    }

    const result = await client.query(
      `INSERT INTO public.tv_remotes (name, brand, category, barcode, description, specs, image_filename, quantity, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        name,
        brand,
        category,
        barcode ?? null,
        description ?? null,
        specs ?? {},
        normalizeImageFilename(image_filename),
        typeof quantity === "number" ? quantity : null,
        price ?? null,
      ]
    );

    return NextResponse.json({ id: result.rows[0]?.id }, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to add TV remote" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(req: Request) {
  const client = await pool.connect();
  try {
    const { id, name, brand, category, barcode, description, specs, image_filename, quantity, price } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const result = await client.query(
      `UPDATE public.tv_remotes
       SET
         name = COALESCE($1, name),
         brand = COALESCE($2, brand),
         category = COALESCE($3, category),
         barcode = COALESCE($4, barcode),
         description = COALESCE($5, description),
         specs = COALESCE($6, specs),
         image_filename = COALESCE($7, image_filename),
         quantity = COALESCE($8, quantity),
         price = COALESCE($9, price)
       WHERE id = $10`,
      [name, brand, category, barcode, description, specs, normalizeImageFilename(image_filename), quantity, price, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to update TV remote" }, { status: 500 });
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

    const result = await client.query("DELETE FROM public.tv_remotes WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to delete TV remote" }, { status: 500 });
  } finally {
    client.release();
  }
}
