import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type UploadSection =
  | 'arduino'
  | 'mainproducts'
  | 'mainSideLeds'
  | 'sprayGum'
  | 'solar'
  | 'mexxsun'
  | 'sound'
  | 'battery'
  | 'tv'
  | 'filaments'
  | 'fans'
  | 'others'
  | 'electric'
  | 'adapters'
  | 'chargers'
  | 'lamps';

interface UploadConfig {
  folder: string;
  tableName: string;
}

const ASSETS_ROOT = '/opt/assets';

const sectionConfig: Record<UploadSection, UploadConfig> = {
  arduino: { folder: 'arduinoproducts', tableName: 'arduino' },
  mainproducts: { folder: 'mainproducts', tableName: 'main' },
  mainSideLeds: { folder: 'mainSideLeds', tableName: 'mainled' },
  sprayGum: { folder: 'spraygum', tableName: 'spray_gum' },
  solar: { folder: 'solarproducts', tableName: 'solardb' },
  mexxsun: { folder: 'mexxsun', tableName: 'mexxsun' },
  sound: { folder: 'soundproducts', tableName: 'sound' },
  battery: { folder: 'batteries', tableName: 'batteries' },
  tv: { folder: 'tv', tableName: 'tv_remotes' },
  filaments: { folder: 'filaments', tableName: 'filaments' },
  fans: { folder: 'fans', tableName: 'fans' },
  others: { folder: 'others', tableName: 'others' },
  electric: { folder: 'electric', tableName: 'electric' },
  adapters: { folder: 'adapters', tableName: 'adapters' },
  chargers: { folder: 'chargers', tableName: 'chargers' },
  lamps: { folder: 'lamp', tableName: 'lamps' },
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function splitExt(name: string) {
  const ext = path.extname(name);
  const base = ext ? name.slice(0, -ext.length) : name;
  return { base, ext };
}

export async function handleImageUpload(
  file: File,
  id: string,
  section: UploadSection,
  pool: {
    connect: () => Promise<{
      query: (text: string, params?: unknown[]) => Promise<{ rowCount: number; rows?: unknown[] }>;
      release: () => void;
    }>;
  }
) {
  const config = sectionConfig[section];
  if (!config) throw new Error(`Invalid section: ${section}`);

  const safeName = sanitizeFileName(file.name || 'upload.bin');
  const { base, ext } = splitExt(safeName);
  const unique = randomUUID().slice(0, 8);
  const fileName = `${id}-${base}-${unique}${ext}`;
  const fsDir = path.join(ASSETS_ROOT, config.folder);
  const fsPath = path.join(fsDir, fileName);
  const publicPath = `/assets/${config.folder}/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(fsDir, { recursive: true });
  await writeFile(fsPath, buffer);

  let client:
    | {
        query: (text: string, params?: unknown[]) => Promise<{ rowCount: number; rows?: unknown[] }>;
        release: () => void;
      }
    | undefined;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE public.${config.tableName} SET image_filename = $1 WHERE id = $2 RETURNING *`,
      [publicPath, id]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new Error(`No record found with id ${id} in ${config.tableName}`);
    }

    await client.query('COMMIT');
    return { url: publicPath };
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    throw error;
  } finally {
    if (client) client.release();
  }
}
