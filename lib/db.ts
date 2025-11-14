import { Pool, PoolConfig } from "pg";

type EnvConfig = {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: PoolConfig["ssl"];
};

const buildConfig = (): PoolConfig => {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;

  const hasDiscreteCredentials =
    process.env.PGHOST ||
    process.env.PGPORT ||
    process.env.PGDATABASE ||
    process.env.PGUSER ||
    process.env.PGPASSWORD;

  const sslRequired =
    process.env.PGSSLMODE === "require" || process.env.NODE_ENV === "production";

  let envConfig: EnvConfig;

  if (connectionString) {
    envConfig = {
      connectionString,
      ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
    };
  } else if (hasDiscreteCredentials) {
    envConfig = {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
    };
  } else {
    throw new Error(
      "Database connection is not configured. Provide DATABASE_URL or PG* environment variables."
    );
  }

  return {
    client_encoding: "UTF8",
    query_timeout: 10_000,
    ...envConfig,
  };
};

const pool = new Pool(buildConfig());

pool.on("connect", (client) => {
  void client.query("SET client_encoding = 'UTF8';");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export default pool;