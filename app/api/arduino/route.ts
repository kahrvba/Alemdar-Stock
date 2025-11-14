import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get('barcode');
  const query = searchParams.get('query')?.trim();
  const field = searchParams.get('field');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');

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

    if (barcode) {
      const result = await client.query(
        'SELECT *, COALESCE(quantity, 0) as quantity FROM public.arduino WHERE barcode = $1 ORDER BY id ASC',
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
        const escapedLike = `%${query.replace(/[%_]/g, "\\$&")}%`;
        
        // If field is specified, search only that field
        if (field && ['id', 'english_names', 'turkish_names', 'category', 'barcode'].includes(field)) {
          if (field === 'id') {
            // For ID, do exact match
            values.push(query);
            whereClause = `WHERE CAST(id AS TEXT) = $1`;
          } else {
            // For other fields, do ILIKE search
            values.push(escapedLike);
            whereClause = `WHERE ${field} ILIKE $1 ESCAPE '\\'`;
          }
        } else {
          // Search all fields if no specific field is selected
          values.push(escapedLike, escapedLike, escapedLike, escapedLike, query);
          whereClause = `WHERE (
            english_names ILIKE $1 ESCAPE '\\' OR
            turkish_names ILIKE $2 ESCAPE '\\' OR
            category ILIKE $3 ESCAPE '\\' OR
            barcode ILIKE $4 ESCAPE '\\' OR
            CAST(id AS TEXT) = $5
          )`;
        }
      }

      const totalResult = await client.query(
        `SELECT COUNT(*) FROM public.arduino ${whereClause}`,
        values
      );
      total = Number(totalResult.rows[0]?.count ?? 0);

      const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      const offset = (currentPage - 1) * currentPageSize;
      const result = await client.query(
        `SELECT *, COALESCE(quantity, 0) as quantity FROM public.arduino ${whereClause} ORDER BY id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
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
    const { english_names, turkish_names, category, barcode, quantity, price, image_filename, description } = await req.json();
    
    // Start a transaction
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");
    
    const maxIdResult = await client.query('SELECT MAX(id) FROM public.arduino');
    const maxId = maxIdResult.rows[0].max || 0;
    
    const newId = maxId + 1;
    await client.query(
      'INSERT INTO public.arduino (id, english_names, turkish_names, category, barcode, quantity, price, image_filename, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [newId, english_names, turkish_names, category, barcode, quantity, price, image_filename, description]
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
    const { id, english_names, turkish_names, category, barcode, quantity, price, image_filename, description } = await req.json();

    await client.query('BEGIN');
    
    await client.query(
      `UPDATE public.arduino 
       SET 
         english_names=COALESCE($1, english_names), 
         turkish_names=COALESCE($2, turkish_names), 
         category=COALESCE($3, category), 
         barcode=COALESCE($4, barcode), 
         quantity=COALESCE($5, quantity), 
         price=COALESCE($6, price), 
         image_filename=COALESCE($7, image_filename),
         description=COALESCE($8, description)
       WHERE id=$9`,
      [english_names, turkish_names, category, barcode, quantity, price, image_filename, description, id]
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
    await client.query('DELETE FROM public.arduino WHERE id=$1', [id]);
    
    // Update the sequence to the current maximum ID
    await client.query(`SELECT setval('arduino_id_seq', COALESCE((SELECT MAX(id) FROM public.arduino), 0));`);
    
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
