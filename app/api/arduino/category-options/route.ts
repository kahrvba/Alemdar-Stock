import { NextResponse } from "next/server";
import pool from "@/lib/db";

const CATEGORY_FIELDS = [
  "category",
  "category_layer_1",
  "category_layer_2",
] as const;

type CategoryField = (typeof CATEGORY_FIELDS)[number];

const isCategoryField = (value: string): value is CategoryField =>
  CATEGORY_FIELDS.includes(value as CategoryField);

export async function GET() {
  const client = await pool.connect();

  try {
    const result = await client.query<{
      id: number | string;
      field_name: CategoryField;
      label: string;
    }>(
      `SELECT id, field_name, label
       FROM public.arduino_category_options
       ORDER BY field_name ASC, label ASC`
    );

    const grouped = {
      category: [] as { id: number; label: string }[],
      category_layer_1: [] as { id: number; label: string }[],
      category_layer_2: [] as { id: number; label: string }[],
    };

    for (const row of result.rows) {
      if (isCategoryField(row.field_name)) {
        grouped[row.field_name].push({
          id: Number(row.id),
          label: row.label,
        });
      }
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("[arduino/category-options][GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch category options" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const payload = (await req.json()) as {
      fieldName?: string;
      label?: string;
    };

    const fieldName = payload.fieldName?.trim() ?? "";
    const label = payload.label?.trim() ?? "";

    if (!isCategoryField(fieldName)) {
      return NextResponse.json(
        { error: "Invalid category field" },
        { status: 400 }
      );
    }

    if (!label) {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    const result = await client.query(
      `INSERT INTO public.arduino_category_options (field_name, label)
       VALUES ($1, $2)
       ON CONFLICT (field_name, normalized_label)
       DO UPDATE SET label = EXCLUDED.label
       RETURNING id, field_name, label`,
      [fieldName, label]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[arduino/category-options][POST]", error);
    return NextResponse.json(
      { error: "Failed to save category option" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request) {
  const client = await pool.connect();

  try {
    const payload = (await req.json()) as {
      id?: number;
    };

    const id = Number(payload.id);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid option id" }, { status: 400 });
    }

    await client.query(
      "DELETE FROM public.arduino_category_options WHERE id = $1",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[arduino/category-options][DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete category option" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
