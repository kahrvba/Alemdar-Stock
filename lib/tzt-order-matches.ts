import { readFile } from "node:fs/promises";
import path from "node:path";
import pool from "@/lib/db";

export type TztOrderProduct = {
  sourceRow: number;
  tztGoodsId: string;
  tableName: string;
  id: number;
  name: string;
  quantity: number;
  confidence: number;
};

const MATCH_FILE = "tzt-order-neon-id-matches-2026-04-24.md";

const splitMarkdownRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((value) => value.trim());

type ParsedMatch = Omit<TztOrderProduct, "quantity">;

const loadParsedMatches = async (): Promise<ParsedMatch[]> => {
  const filePath = path.join(process.cwd(), MATCH_FILE);
  const markdown = await readFile(filePath, "utf8");
  const lines = markdown.split(/\r?\n/);
  const matchedHeadingIndex = lines.findIndex((line) => line.trim() === "## Matched IDs");
  const skippedHeadingIndex = lines.findIndex((line) =>
    line.trim().startsWith("## Skipped:")
  );

  if (matchedHeadingIndex === -1) return [];

  const tableLines = lines.slice(
    matchedHeadingIndex + 1,
    skippedHeadingIndex === -1 ? undefined : skippedHeadingIndex
  );

  return tableLines
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .map(splitMarkdownRow)
    .filter((cells) => cells.length >= 7 && cells[0] !== "#")
    .map((cells) => ({
      sourceRow: Number(cells[0]),
      tztGoodsId: cells[1],
      tableName: cells[3],
      id: Number(cells[4]),
      name: cells[5],
      confidence: Number(cells[6]),
    }))
    .filter(
      (product) =>
        Number.isFinite(product.sourceRow) &&
        Number.isFinite(product.id) &&
        Number.isFinite(product.confidence) &&
        product.confidence >= 96 &&
        product.name.length > 0
    );
};

export async function loadTztOrderProducts(): Promise<TztOrderProduct[]> {
  const matches = await loadParsedMatches();
  const arduinoIds = matches
    .filter((match) => match.tableName === "arduino")
    .map((match) => match.id);
  const mainledIds = matches
    .filter((match) => match.tableName === "mainled")
    .map((match) => match.id);

  const client = await pool.connect();

  try {
    const [arduinoResult, mainledResult] = await Promise.all([
      arduinoIds.length
        ? client.query(
            `SELECT id, english_names AS name, COALESCE(quantity, 0)::int AS quantity
             FROM public.arduino
             WHERE id = ANY($1::int[])`,
            [arduinoIds]
          )
        : Promise.resolve({ rows: [] }),
      mainledIds.length
        ? client.query(
            `SELECT id, english_name AS name, COALESCE(quantity, 0)::int AS quantity
             FROM public.mainled
             WHERE id = ANY($1::int[])`,
            [mainledIds]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    const stockByKey = new Map<string, { name: string; quantity: number }>();

    for (const row of arduinoResult.rows) {
      stockByKey.set(`arduino:${row.id}`, {
        name: String(row.name ?? ""),
        quantity: Number(row.quantity ?? 0),
      });
    }

    for (const row of mainledResult.rows) {
      stockByKey.set(`mainled:${row.id}`, {
        name: String(row.name ?? ""),
        quantity: Number(row.quantity ?? 0),
      });
    }

    return matches.map((match) => {
      const stock = stockByKey.get(`${match.tableName}:${match.id}`);

      return {
        ...match,
        name: stock?.name || match.name,
        quantity: stock?.quantity ?? 0,
      };
    });
  } finally {
    client.release();
  }
}
