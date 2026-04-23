#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  const migrationPathArg = process.argv[2];
  if (!migrationPathArg) {
    throw new Error("Missing migration SQL path argument");
  }

  const rootDir = process.cwd();
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, ".env"));

  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
  }

  const migrationPath = path.isAbsolute(migrationPathArg)
    ? migrationPathArg
    : path.join(rootDir, migrationPathArg);
  const sql = fs.readFileSync(migrationPath, "utf8");

  const client = new Client({
    connectionString,
    ssl: process.env.PGSSLMODE === "require" || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`Migration applied: ${migrationPath}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
