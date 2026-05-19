import { NextResponse } from "next/server";
import pool from "@/lib/db";

const MAX_ATTEMPTS = 50;
const BARCODE_LENGTH = 12;

const TABLES_WITH_BARCODE = [
  "public.arduino",
  "public.mainled",
  "public.spray_gum",
  "public.solardb",
  "public.mexxsun",
  "public.sound",
  "public.batteries",
  "public.tv_remotes",
  "public.filaments",
  "public.fans",
  "public.others",
  "public.electric",
  "public.adapters",
  "public.chargers",
] as const;

const generateCandidate = () => {
  const min = 10 ** (BARCODE_LENGTH - 1);
  const max = 10 ** BARCODE_LENGTH - 1;
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(value);
};

const isBarcodeTaken = async (barcode: string) => {
  const existsClauses = TABLES_WITH_BARCODE.map(
    (tableName) => `EXISTS (SELECT 1 FROM ${tableName} WHERE barcode = $1)`
  ).join(" OR ");

  const sql = `
    SELECT (${existsClauses}) AS exists
  `;

  const result = await pool.query<{ exists: boolean }>(sql, [barcode]);
  return result.rows[0]?.exists ?? false;
};

export async function POST() {
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const barcode = generateCandidate();
      const taken = await isBarcodeTaken(barcode);
      if (!taken) {
        return NextResponse.json({ barcode });
      }
    }

    return NextResponse.json(
      { error: "Failed to generate a unique barcode" },
      { status: 500 }
    );
  } catch (error) {
    console.error("[generate-barcode][POST] failed:", error);
    return NextResponse.json(
      { error: "Failed to generate a unique barcode" },
      { status: 500 }
    );
  }
}
