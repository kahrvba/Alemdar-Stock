import { NextResponse } from "next/server";
import pool from "@/lib/db";

const DAY_TOTAL_PASSWORD = "454700";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim() ?? "";

  if (password !== DAY_TOTAL_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query("SET client_encoding = 'UTF8';");
    const result = await client.query<{ total: string | number | null }>(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM public.invoices
       WHERE date_created >= CURRENT_DATE
         AND date_created < CURRENT_DATE + INTERVAL '1 day'`
    );

    const rawTotal = result.rows[0]?.total;
    const total = typeof rawTotal === "number" ? rawTotal : Number(rawTotal ?? 0);

    return NextResponse.json({
      success: true,
      total: Number.isFinite(total) ? total : 0,
    });
  } catch (error) {
    console.error("[day-total] failed:", error);
    return NextResponse.json({ error: "Failed to load total" }, { status: 500 });
  } finally {
    client.release();
  }
}

