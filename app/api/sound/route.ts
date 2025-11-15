import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get('barcode');
  const query = searchParams.get('query')?.trim();
  const field = searchParams.get('field');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');
  const all = searchParams.get('all') === 'true';
  const id = searchParams.get('id');

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

    if (id) {
      // Fetch a single product by ID
      const result = await client.query(
        'SELECT id, english_name, turkish_name, barcode, kodu, price, image_filename, category, sub_category, COALESCE(quantity, 0) as quantity, description FROM public.sound WHERE id = $1',
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
        'SELECT id, english_name, turkish_name, barcode, kodu, price, image_filename, category, sub_category, COALESCE(quantity, 0) as quantity, description FROM public.sound ORDER BY id ASC'
      );
      const totalResult = await client.query('SELECT COUNT(*) FROM public.sound');
      client.release();

      return NextResponse.json({
        products: result.rows,
        total: parseInt(totalResult.rows[0].count, 10)
      });
    }

    if (barcode) {
      const result = await client.query(
        'SELECT id, english_name, turkish_name, barcode, kodu, price, image_filename, category, sub_category, COALESCE(quantity, 0) as quantity, description FROM public.sound WHERE barcode = $1 ORDER BY id ASC',
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
        if (field && ['id', 'english_name', 'turkish_name', 'category', 'barcode', 'kodu'].includes(field)) {
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
          values.push(escapedLike, escapedLike, escapedLike, escapedLike, escapedLike, query);
          whereClause = `WHERE (
            english_name ILIKE $1 ESCAPE '\\' OR
            turkish_name ILIKE $2 ESCAPE '\\' OR
            category ILIKE $3 ESCAPE '\\' OR
            barcode ILIKE $4 ESCAPE '\\' OR
            kodu ILIKE $5 ESCAPE '\\' OR
            CAST(id AS TEXT) = $6
          )`;
        }
      }

      const totalResult = await client.query(
        `SELECT COUNT(*) FROM public.sound ${whereClause}`,
        values
      );
      total = Number(totalResult.rows[0]?.count ?? 0);

      const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      const offset = (currentPage - 1) * currentPageSize;
      const result = await client.query(
        `SELECT id, english_name, turkish_name, barcode, kodu, price, image_filename, category, sub_category, COALESCE(quantity, 0) as quantity, description FROM public.sound ${whereClause} ORDER BY id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
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
    const { english_name, turkish_name, barcode, kodu, price, 
      image_filename, 
      category, sub_category, description } = await req.json();
    
    // Start a transaction
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");
    
    // Check if sequence exists, if not create it or use MAX+1
    let newId: number;
    try {
      // Try to use the sequence
      const seqResult = await client.query('SELECT nextval(\'public.sound_id_seq\') as id');
      newId = seqResult.rows[0].id;
    } catch (seqError) {
      // Sequence doesn't exist, use MAX(id) + 1 as fallback
      console.warn('Sequence not found, using MAX(id) + 1 method');
      const maxResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM public.sound');
      newId = maxResult.rows[0].next_id;
    }
    
    // Insert with the generated ID
    const result = await client.query(
      'INSERT INTO public.sound (id, english_name, turkish_name, barcode, kodu, price, image_filename, category, sub_category, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
      [newId, english_name, turkish_name, barcode, kodu, price, image_filename, category, sub_category, description]
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
    const { id, english_name, turkish_name, barcode, kodu, price, 
      image_filename, 
      category, sub_category, quantity, description } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    await client.query('BEGIN');
    await client.query("SET client_encoding = 'UTF8';");
    
    // Check if product exists
    const checkResult = await client.query('SELECT id FROM public.sound WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const result = await client.query(
      `UPDATE public.sound 
       SET 
         english_name=$1, 
         turkish_name=$2, 
         barcode=$3, 
         kodu=$4, 
         price=$5, 
         image_filename=$6,
         category=$7, 
         sub_category=$8, 
         quantity=$9, 
         description=$10
       WHERE id=$11`,
      [english_name, turkish_name, barcode, kodu, price, image_filename, category, sub_category, quantity, description, id]
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
    const checkResult = await client.query('SELECT id FROM public.sound WHERE id = $1', [productId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('DELETE: Product not found with ID:', productId);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    console.log('DELETE: Attempting to delete product with ID:', productId);
    
    // Delete the record
    const deleteResult = await client.query('DELETE FROM public.sound WHERE id=$1', [productId]);
    
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
      await client.query(`SELECT setval('public.sound_id_seq', COALESCE((SELECT MAX(id) FROM public.sound), 0));`);
    } catch (seqError) {
      // Sequence might not exist yet, that's okay - just log it
      console.warn('Could not update sound_id_seq (sequence may not exist):', seqError);
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
