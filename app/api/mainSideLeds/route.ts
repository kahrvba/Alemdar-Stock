import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const CABLE_SEARCH_FIELDS = ['id', 'english_name', 'turkish_name', 'category', 'barcode'] as const;
type CableSearchField = (typeof CABLE_SEARCH_FIELDS)[number];

const COMPACT_REGEX = '[[:space:]/_.-]+';
const CABLE_SEARCHABLE_EXPR =
  "LOWER(COALESCE(english_name, '') || ' ' || COALESCE(turkish_name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(barcode, ''))";
const CABLE_SEARCHABLE_COMPACT_EXPR =
  `REGEXP_REPLACE(${CABLE_SEARCHABLE_EXPR}, '${COMPACT_REGEX}', '', 'g')`;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
const toCompact = (value: string) => value.replace(/[ /_.-]+/g, '');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get('barcode');
  const query = searchParams.get('query')?.trim();
  const field = searchParams.get('field');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');
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
    let currentPageSize = pageSize;

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
        'SELECT *, COALESCE(quantity, 0) as quantity FROM public.mainled WHERE id = ANY($1) ORDER BY id ASC',
        [ids]
      );
      client.release();
      return NextResponse.json({ items: result.rows });
    }

    if (barcode) {
      const result = await client.query(
        'SELECT *, COALESCE(quantity, 0) as quantity FROM public.mainled WHERE barcode = $1 ORDER BY id ASC',
        [barcode]
      );
      items = result.rows ?? [];
      total = items.length;
      currentPage = 1;
      currentPageSize = total || pageSize;
    } else {
      const values: unknown[] = [];
      let whereClause = '';

      if (query) {
        const normalizedQuery = query.toLowerCase();
        const escapedLike = `%${escapeLike(normalizedQuery)}%`;
        const compactQuery = toCompact(normalizedQuery);
        const escapedCompactLike = compactQuery ? `%${escapeLike(compactQuery)}%` : null;
        const numericQuery = /^\d+$/.test(query) ? Number(query) : null;
        
        // If field is specified, search only that field
        if (field && CABLE_SEARCH_FIELDS.includes(field as CableSearchField)) {
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
            ${CABLE_SEARCHABLE_EXPR} LIKE $1::text OR
            ($2::text IS NOT NULL AND ${CABLE_SEARCHABLE_COMPACT_EXPR} LIKE $2::text) OR
            ($3::int IS NOT NULL AND id = $3::int)
          )`;
        }
      }

      const totalResult = await client.query(
        `SELECT COUNT(*) FROM public.mainled ${whereClause}`,
        values
      );
      total = Number(totalResult.rows[0]?.count ?? 0);

      const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      const offset = (currentPage - 1) * currentPageSize;
      const result = await client.query(
        `SELECT *, COALESCE(quantity, 0) as quantity FROM public.mainled ${whereClause} ORDER BY id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, currentPageSize, offset]
      );
      items = result.rows ?? [];
    }

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
    const { english_name, turkish_name, category, barcode, quantity, price, image_filename, description } = await req.json();
    
    // Start a transaction
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");

    let newId: number;
    try {
      const seqResult = await client.query("SELECT nextval('public.mainled_id_seq') AS id");
      newId = Number(seqResult.rows[0]?.id);
    } catch {
      console.warn('Sequence not found, using MAX(id) + 1 method');
      await client.query('LOCK TABLE public.mainled IN EXCLUSIVE MODE');
      const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM public.mainled');
      newId = Number(maxIdResult.rows[0]?.next_id ?? 1);
    }

    await client.query(
      'INSERT INTO public.mainled (id, english_name, turkish_name, category, barcode, quantity, price, image_filename, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [newId, english_name, turkish_name, category, barcode, quantity, price, image_filename, description]
    );

    await client.query('COMMIT');
    return NextResponse.json({ id: newId, message: 'Product added successfully' }, { status: 201 });
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
    const { id, english_name, turkish_name, category, barcode, quantity, price, image_filename, description } = await req.json();

    await client.query('BEGIN');
    
    await client.query(
      `UPDATE public.mainled 
       SET 
         english_name=COALESCE($1, english_name), 
         turkish_name=COALESCE($2, turkish_name), 
         category=COALESCE($3, category), 
         barcode=COALESCE($4, barcode), 
         quantity=COALESCE($5, quantity), 
         price=COALESCE($6, price), 
         image_filename=COALESCE($7, image_filename),
         description=COALESCE($8, description)
       WHERE id=$9`,
      [english_name, turkish_name, category, barcode, quantity, price, image_filename, description, id]
    );

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
    
    await client.query('BEGIN');
    
    // Delete the record
    await client.query('DELETE FROM public.mainled WHERE id=$1', [id]);
    
    // Update the sequence to the current maximum ID
    await client.query(`SELECT setval('mainled_id_seq', COALESCE((SELECT MAX(id) FROM public.mainled), 0));`);
    
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
