import { put } from '@vercel/blob';

export type UploadSection = 'arduino' | 'mainproducts' | 'mainSideLeds' | 'solar';

interface UploadConfig {
  folder: string;
  tableName: string;
}

const sectionConfig: Record<UploadSection, UploadConfig> = {
  'arduino': {
    folder: 'arduinoproducts',
    tableName: 'arduino'
  },
  'mainproducts': {
    folder: 'mainproducts',
    tableName: 'main'
  },
  'mainSideLeds': {
    folder: 'mainSideLeds',
    tableName: 'mainled'
  },
  'solar': {
    folder: 'solarproducts',
    tableName: 'solardb'
  }
};

export async function handleImageUpload(
  file: File,
  id: string,
  section: UploadSection,
  pool: {
    connect: () => Promise<{
      query: (
        text: string,
        params?: unknown[]
      ) => Promise<{ rowCount: number; rows?: unknown[] }>;
      release: () => void;
    }>;
  }
) {
  console.log(`handleImageUpload called with id: ${id}, section: ${section}, file: ${file.name}`);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is not configured');
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  const config = sectionConfig[section];
  if (!config) {
    console.error(`Invalid section: ${section}`);
    throw new Error(`Invalid section: ${section}`);
  }

  console.log(`Using config: folder=${config.folder}, tableName=${config.tableName}`);

  let client:
    | {
        query: (
          text: string,
          params?: unknown[]
        ) => Promise<{ rowCount: number; rows?: unknown[] }>;
        release: () => void;
      }
    | undefined;
  try {
    // Upload to Vercel Blob
    console.log(`Uploading file to Vercel Blob: ${config.folder}/${id}-${file.name}`);
    const blob = await put(`${config.folder}/${id}-${file.name}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log('Blob upload successful:', blob);

    // Get client connection
    console.log('Connecting to database...');
    client = await pool.connect();

    // Start transaction
    console.log('Starting database transaction...');
    await client.query('BEGIN');

    // Update database with the Blob URL
    console.log(`Updating ${config.tableName} with blob URL for id ${id}`);
    const result = await client.query(
      `UPDATE public.${config.tableName} SET image_filename = $1 WHERE id = $2 RETURNING *`,
      [blob.url, id]
    );

    console.log(`Database update result: ${result.rowCount} rows affected`);

    if (result.rowCount === 0) {
      console.error(`No record found with id ${id} in ${config.tableName}`);
      throw new Error(`No record found with id ${id} in ${config.tableName}`);
    }

    // Commit transaction
    console.log('Committing transaction...');
    await client.query('COMMIT');

    console.log(`Successfully updated ${config.tableName} with blob URL:`, {
      id,
      url: blob.url,
      table: config.tableName
    });

    return { url: blob.url };
  } catch (error) {
    console.error(`Error in handleImageUpload:`, error);

    if (client) {
      console.log('Rolling back transaction...');
      await client.query('ROLLBACK');
    }

    console.error(`Upload error for ${section}:`, error);
    throw error;
  } finally {
    if (client) {
      console.log('Releasing database client...');
      client.release();
    }
  }
}
