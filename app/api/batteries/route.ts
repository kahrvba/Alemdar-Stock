import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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
        'SELECT id, model, volt, quantity, price, image_filename FROM public.batteries WHERE id = ANY($1) ORDER BY id ASC',
        [ids]
      );
      client.release();
      return NextResponse.json({ items: result.rows });
    }

    if (id) {
      const result = await client.query(
        'SELECT id, model, volt, quantity, price, image_filename FROM public.batteries WHERE id = $1',
        [id]
      );
      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    }

    if (all) {
      const result = await client.query(
        'SELECT id, model, volt, quantity, price, image_filename FROM public.batteries ORDER BY id ASC'
      );
      const totalResult = await client.query('SELECT COUNT(*) FROM public.batteries');
      client.release();

      return NextResponse.json({
        products: result.rows,
        total: parseInt(totalResult.rows[0].count, 10)
      });
    }

    {
      const values: unknown[] = [];
      let whereClause = '';

      if (query) {
        const escapedLike = `%${query.replace(/[%_]/g, "\\$&")}%`;

        if (field && ['id', 'model', 'volt'].includes(field)) {
          if (field === 'id') {
            values.push(query);
            whereClause = `WHERE CAST(id AS TEXT) = $1`;
          } else {
            values.push(escapedLike);
            whereClause = `WHERE ${field} ILIKE $1 ESCAPE '\\'`;
          }
        } else {
          values.push(escapedLike, escapedLike, query);
          whereClause = `WHERE (
            model ILIKE $1 ESCAPE '\\' OR
            volt ILIKE $2 ESCAPE '\\' OR
            CAST(id AS TEXT) = $3
          )`;
        }
      }

      const totalResult = await client.query(
        `SELECT COUNT(*) FROM public.batteries ${whereClause}`,
        values
      );
      total = Number(totalResult.rows[0]?.count ?? 0);

      const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      const offset = (currentPage - 1) * currentPageSize;
      const result = await client.query(
        `SELECT id, model, volt, quantity, price, image_filename FROM public.batteries ${whereClause} ORDER BY id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
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
    const { model, volt, quantity, price } = await req.json();
    
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");
    
    let newId: number;
    try {
      const seqResult = await client.query('SELECT nextval(\'public.batteries_id_seq\') as id');
      newId = seqResult.rows[0].id;
    } catch {
      console.warn('Sequence not found, using MAX(id) + 1 method');
      const maxResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM public.batteries');
      newId = maxResult.rows[0].next_id;
    }
    
    const result = await client.query(
      'INSERT INTO public.batteries (id, model, volt, quantity, price) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [newId, model, volt, quantity ?? null, price ?? null]
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
    const { id, model, volt, quantity, price } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");
    
    const checkResult = await client.query('SELECT id FROM public.batteries WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const result = await client.query(
      `UPDATE public.batteries 
       SET 
         model=$1,
         volt=$2,
         quantity=$3,
         price=$4
       WHERE id=$5`,
      [model, volt, quantity ?? null, price ?? null, id]
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
    
    const productId = Number(id);
    if (isNaN(productId) || productId <= 0) {
      console.error('DELETE: Invalid product ID:', id);
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    
    await client.query('BEGIN');
    
    const checkResult = await client.query('SELECT id FROM public.batteries WHERE id = $1', [productId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('DELETE: Product not found with ID:', productId);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    console.log('DELETE: Attempting to delete product with ID:', productId);
    
    const deleteResult = await client.query('DELETE FROM public.batteries WHERE id=$1', [productId]);
    
    console.log('DELETE: Deletion result - rowCount:', deleteResult.rowCount);
    
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      console.error('DELETE: No rows deleted for ID:', productId);
      return NextResponse.json({ error: 'Failed to delete product - no rows affected' }, { status: 400 });
    }
    
    try {
      await client.query(`SELECT setval('public.batteries_id_seq', COALESCE((SELECT MAX(id) FROM public.batteries), 0));`);
    } catch (seqError) {
      console.warn('Could not update batteries_id_seq (sequence may not exist):', seqError);
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
