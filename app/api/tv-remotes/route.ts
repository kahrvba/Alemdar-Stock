import { NextResponse } from "next/server";
import pool from "@/lib/db";

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
      const escapedLike = `%${query.replace(/[%_]/g, "\\$&")}%`;

      if (field && ["id", "name", "brand", "category"].includes(field)) {
        if (field === "id") {
          values.push(query);
          whereClause = "WHERE CAST(id AS TEXT) = $1";
        } else {
          values.push(escapedLike);
          whereClause = `WHERE ${field} ILIKE $1 ESCAPE '\\'`;
        }
      } else {
        values.push(escapedLike, escapedLike, escapedLike, query);
        whereClause = `WHERE (
          name ILIKE $1 ESCAPE '\\' OR
          brand ILIKE $2 ESCAPE '\\' OR
          category ILIKE $3 ESCAPE '\\' OR
          CAST(id AS TEXT) = $4
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
      `SELECT id, name, brand, category, description, specs, image_filename, COALESCE(quantity, 0) as quantity, price
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
    const { name, brand, category, description, specs, image_filename, quantity, price } = await req.json();

    if (!name || !brand || !category) {
      return NextResponse.json({ error: "Name, brand, and category are required" }, { status: 400 });
    }

    const result = await client.query(
      `INSERT INTO public.tv_remotes (name, brand, category, description, specs, image_filename, quantity, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        name,
        brand,
        category,
        description ?? null,
        specs ?? {},
        image_filename ?? null,
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
    const { id, name, brand, category, description, specs, image_filename, quantity, price } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const result = await client.query(
      `UPDATE public.tv_remotes
       SET
         name = COALESCE($1, name),
         brand = COALESCE($2, brand),
         category = COALESCE($3, category),
         description = COALESCE($4, description),
         specs = COALESCE($5, specs),
         image_filename = COALESCE($6, image_filename),
         quantity = COALESCE($7, quantity),
         price = COALESCE($8, price)
       WHERE id = $9`,
      [name, brand, category, description, specs, image_filename, quantity, price, id]
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
