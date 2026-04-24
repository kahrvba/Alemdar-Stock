import { NextResponse } from "next/server";
import pool from "@/lib/db";

type StockTable = "arduino" | "mainled";

const isStockTable = (value: unknown): value is StockTable =>
  value === "arduino" || value === "mainled";

export async function PUT(req: Request) {
  const body = await req.json();
  const tableName = body.tableName;
  const id = Number(body.id);
  const quantity = Number(body.quantity);

  if (!isStockTable(tableName)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      tableName === "arduino"
        ? "UPDATE public.arduino SET quantity = $1 WHERE id = $2 RETURNING id, english_names AS name, COALESCE(quantity, 0)::int AS quantity"
        : "UPDATE public.mainled SET quantity = $1 WHERE id = $2 RETURNING id, english_name AS name, COALESCE(quantity, 0)::int AS quantity",
      [quantity, id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await client.query("COMMIT");
    return NextResponse.json({
      tableName,
      id,
      name: result.rows[0]?.name ?? "",
      quantity: result.rows[0]?.quantity ?? quantity,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[tzt-order/quantity] update error:", error);
    return NextResponse.json({ error: "Failed to update quantity" }, { status: 500 });
  } finally {
    client.release();
  }
}
