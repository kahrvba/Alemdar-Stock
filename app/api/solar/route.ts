import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const SOLAR_SEARCH_FIELDS = ['id', 'name', 'category', 'rating'] as const;
type SolarSearchField = (typeof SOLAR_SEARCH_FIELDS)[number];

const COMPACT_REGEX = '[[:space:]/_.-]+';
const SOLAR_SEARCHABLE_EXPR =
  "LOWER(COALESCE(name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(rating, ''))";
const SOLAR_SEARCHABLE_COMPACT_EXPR =
  `REGEXP_REPLACE(${SOLAR_SEARCHABLE_EXPR}, '${COMPACT_REGEX}', '', 'g')`;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
const toCompact = (value: string) => value.replace(/[ /_.-]+/g, '');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.trim();
  const field = searchParams.get('field');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');
  const all = searchParams.get('all') === 'true';
  const id = searchParams.get('id');
  const idsParam = searchParams.get('ids');

  const page = Number.isFinite(Number(pageParam)) && Number(pageParam) > 0
    ? Math.floor(Number(pageParam))
    : 1;
  const pageSizeRaw = Number.isFinite(Number(pageSizeParam)) && Number(pageSizeParam) > 0
    ? Math.floor(Number(pageSizeParam))
    : 24;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 60);

  try {
    const client = await pool.connect();
    await client.query("SET client_encoding = 'UTF8';");
    let items = [];
    let total = 0;
    let currentPage = page;
    const currentPageSize = pageSize;

    const ids = idsParam
      ? Array.from(
          new Set(
            idsParam
              .split(',')
              .map((value) => Number(value.trim()))
              .filter((value) => Number.isFinite(value) && value > 0)
          )
        )
      : [];

    if (ids.length > 0) {
      const result = await client.query(
        `SELECT id, name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price, image_filename, category, COALESCE(quantity, 0) as quantity, description, COALESCE(is_new, false) AS is_new
         FROM public.solardb
         WHERE id = ANY($1)
         ORDER BY COALESCE(is_new, false) DESC, CASE WHEN COALESCE(is_new, false) THEN -id ELSE id END ASC`,
        [ids]
      );
      client.release();
      return NextResponse.json({ items: result.rows });
    }

    if (id) {
      // Fetch a single product by ID
      const result = await client.query(
        'SELECT id, name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price, image_filename, category, COALESCE(quantity, 0) as quantity, description, COALESCE(is_new, false) AS is_new FROM public.solardb WHERE id = $1',
        [id]
      );
      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    }

    if (all) {
      // Return all products without pagination
      const result = await client.query(
        `SELECT id, name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price, image_filename, category, COALESCE(quantity, 0) as quantity, description, COALESCE(is_new, false) AS is_new
         FROM public.solardb
         ORDER BY COALESCE(is_new, false) DESC, CASE WHEN COALESCE(is_new, false) THEN -id ELSE id END ASC`
      );
      const totalResult = await client.query('SELECT COUNT(*) FROM public.solardb');
      client.release();

      return NextResponse.json({
        products: result.rows,
        total: parseInt(totalResult.rows[0].count, 10)
      });
    }

    // Remove barcode search since it doesn't exist in the schema
    const values: unknown[] = [];
    let whereClause = '';

    if (query) {
      const normalizedQuery = query.toLowerCase();
      const escapedLike = `%${escapeLike(normalizedQuery)}%`;
      const compactQuery = toCompact(normalizedQuery);
      const escapedCompactLike = compactQuery ? `%${escapeLike(compactQuery)}%` : null;
      const numericQuery = /^\d+$/.test(query) ? Number(query) : null;
      
      // If field is specified, search only that field
      if (field && SOLAR_SEARCH_FIELDS.includes(field as SolarSearchField)) {
        if (field === 'id') {
          // For ID, do exact match
          values.push(numericQuery);
          whereClause = `WHERE ($1::int IS NOT NULL AND id = $1::int)`;
        } else {
          // For text fields, use both standard and compact matching
          const fieldExpr = `LOWER(COALESCE(${field}, ''))`;
          const compactFieldExpr = `REGEXP_REPLACE(${fieldExpr}, '${COMPACT_REGEX}', '', 'g')`;
          values.push(escapedLike, escapedCompactLike);
          whereClause = `WHERE (
            ${fieldExpr} LIKE $1::text
            OR ($2::text IS NOT NULL AND ${compactFieldExpr} LIKE $2::text)
          )`;
        }
      } else {
        // Search all fields with both standard and compact normalization
        values.push(escapedLike, escapedCompactLike, numericQuery);
        whereClause = `WHERE (
          ${SOLAR_SEARCHABLE_EXPR} LIKE $1::text OR
          ($2::text IS NOT NULL AND ${SOLAR_SEARCHABLE_COMPACT_EXPR} LIKE $2::text) OR
          ($3::int IS NOT NULL AND id = $3::int)
        )`;
      }
    }

    const totalResult = await client.query(
      `SELECT COUNT(*) FROM public.solardb ${whereClause}`,
      values
    );
    total = Number(totalResult.rows[0]?.count ?? 0);

    const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const offset = (currentPage - 1) * currentPageSize;
    const result = await client.query(
      `SELECT id, name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price, image_filename, category, COALESCE(quantity, 0) as quantity, description, COALESCE(is_new, false) AS is_new
       FROM public.solardb
       ${whereClause}
       ORDER BY COALESCE(is_new, false) DESC, CASE WHEN COALESCE(is_new, false) THEN -id ELSE id END ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, currentPageSize, offset]
    );
    items = result.rows ?? [];

    client.release();

    const responseBody = {
      items,
      page: currentPage,
      pageSize: currentPageSize,
      total,
      totalPages: Math.max(1, Math.ceil((total || 1) / currentPageSize)),
    };

    return NextResponse.json(responseBody, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    );
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const { name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price,
      image_filename, 
      category, description, is_new } = await req.json();
    const isNewFlag = typeof is_new === 'boolean' ? is_new : Boolean(is_new);
    
    // Start a transaction
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");
    
    // Check if sequence exists, if not create it or use MAX+1
    let newId: number;
    try {
      // Try to use the sequence
      const seqResult = await client.query('SELECT nextval(\'public.solardb_id_seq\') as id');
      newId = seqResult.rows[0].id;
    } catch {
      // Sequence doesn't exist, use MAX(id) + 1 as fallback
      console.warn('Sequence not found, using MAX(id) + 1 method');
      const maxResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM public.solardb');
      newId = maxResult.rows[0].next_id;
    }
    
    // Insert with the generated ID
    const result = await client.query(
      'INSERT INTO public.solardb (id, name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price, image_filename, category, description, is_new) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id',
      [newId, name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price, image_filename, category, description, isNewFlag]
    );

    if (!result.rows[0]?.id) {
      await client.query('ROLLBACK');
      console.error('POST: Failed to get ID after insert');
      return NextResponse.json({ error: 'Failed to create product - no ID returned' }, { status: 500 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ id: result.rows[0].id, message: 'Product added successfully' }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to add product' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(req: Request) {
  const client = await pool.connect();
  try {
    const { id, name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price,
      image_filename, 
      category, quantity, description, is_new } = await req.json();
    const isNewFlag = typeof is_new === 'boolean' ? is_new : (is_new == null ? null : Boolean(is_new));
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");
    
    // Check if product exists
    const checkResult = await client.query('SELECT id FROM public.solardb WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const result = await client.query(
      `UPDATE public.solardb 
       SET 
         name=COALESCE($1, name), 
         rating=COALESCE($2, rating), 
         factory_price=COALESCE($3, factory_price),
         wholesale_price=COALESCE($4, wholesale_price),
         min_selling_price=COALESCE($5, min_selling_price),
         selling_price=COALESCE($6, selling_price),
         factor=COALESCE($7, factor),
         cost_price=COALESCE($8, cost_price),
         image_filename=COALESCE($9, image_filename),
         category=COALESCE($10, category), 
         quantity=COALESCE($11, quantity), 
         description=COALESCE($12, description),
         is_new=COALESCE($13, is_new)
       WHERE id=$14`,
      [name, rating, factory_price, wholesale_price, min_selling_price, selling_price, factor, cost_price, image_filename, category, quantity, description, isNewFlag, id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No rows updated' }, { status: 400 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Product updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request) {
  const client = await pool.connect();
  try {
    const { id } = await req.json();
    
    if (!id) {
      console.error('DELETE: Product ID is missing');
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    // Ensure ID is a number
    const productId = Number(id);
    if (isNaN(productId) || productId <= 0) {
      console.error('DELETE: Invalid product ID:', id);
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    
    await client.query('BEGIN');
    
    // Check if product exists first
    const checkResult = await client.query('SELECT id FROM public.solardb WHERE id = $1', [productId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('DELETE: Product not found with ID:', productId);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    console.log('DELETE: Attempting to delete product with ID:', productId);
    
    // Delete the record
    const deleteResult = await client.query('DELETE FROM public.solardb WHERE id=$1', [productId]);
    
    console.log('DELETE: Deletion result - rowCount:', deleteResult.rowCount);
    
    // Verify deletion was successful
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      console.error('DELETE: No rows deleted for ID:', productId);
      return NextResponse.json({ error: 'Failed to delete product - no rows affected' }, { status: 400 });
    }
    
    // Update the sequence to the current maximum ID (if sequence exists)
    // This ensures the sequence stays in sync after deletions
    try {
      await client.query(`
        WITH seq_target AS (
          SELECT MAX(id)::bigint AS max_id
          FROM public.solardb
        )
        SELECT setval(
          'public.solardb_id_seq',
          CASE WHEN max_id IS NULL THEN 1 ELSE max_id END,
          max_id IS NOT NULL
        )
        FROM seq_target;
      `);
    } catch (seqError) {
      // Sequence might not exist yet, that's okay - just log it
      console.warn('Could not update solar_id_seq (sequence may not exist):', seqError);
    }
    
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  } finally {
    client.release();
  }
}
