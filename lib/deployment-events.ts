import pool from "@/lib/db";
import { incrementPatch, normalizeBaseVersion } from "@/lib/versioning";

export const DEPLOYMENT_CHANNEL = "deployment_updates";

export type DeploymentRecord = {
  deploymentKey: string;
  appVersion: string;
  updatedAt: string;
};

async function ensureDeploymentTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deployment_updates (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      deployment_key TEXT NOT NULL,
      app_version TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function publishDeploymentUpdate(input: {
  deploymentKey: string;
  baseVersion: string;
}) {
  await ensureDeploymentTable();
  const normalizedBaseVersion = normalizeBaseVersion(input.baseVersion);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query<{
      deployment_key: string;
      app_version: string;
      updated_at: string;
    }>(
      `
        SELECT deployment_key, app_version, updated_at
        FROM deployment_updates
        WHERE id = 1
        FOR UPDATE
      `
    );

    const current = currentResult.rows[0];

    if (current && current.deployment_key === input.deploymentKey) {
      await client.query("COMMIT");
      return {
        deploymentKey: current.deployment_key,
        appVersion: current.app_version,
        updatedAt: current.updated_at,
      };
    }

    const nextVersion = incrementPatch(current?.app_version ?? normalizedBaseVersion);

    const upsertResult = await client.query<{
      deployment_key: string;
      app_version: string;
      updated_at: string;
    }>(
      `
        INSERT INTO deployment_updates (id, deployment_key, app_version, updated_at)
        VALUES (1, $1, $2, NOW())
        ON CONFLICT (id) DO UPDATE
        SET deployment_key = EXCLUDED.deployment_key,
            app_version = EXCLUDED.app_version,
            updated_at = NOW()
        RETURNING deployment_key, app_version, updated_at
      `,
      [input.deploymentKey, nextVersion]
    );

    await client.query("COMMIT");

    const row = upsertResult.rows[0];
    const record: DeploymentRecord = {
      deploymentKey: row.deployment_key,
      appVersion: row.app_version,
      updatedAt: row.updated_at,
    };

    await pool.query("SELECT pg_notify($1, $2)", [
      DEPLOYMENT_CHANNEL,
      JSON.stringify(record),
    ]);

    return record;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getLatestDeploymentUpdate(): Promise<DeploymentRecord | null> {
  await ensureDeploymentTable();

  const result = await pool.query<{
    deployment_key: string;
    app_version: string;
    updated_at: string;
  }>(
    `
      SELECT deployment_key, app_version, updated_at
      FROM deployment_updates
      WHERE id = 1
      LIMIT 1
    `
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    deploymentKey: row.deployment_key,
    appVersion: row.app_version,
    updatedAt: row.updated_at,
  };
}
