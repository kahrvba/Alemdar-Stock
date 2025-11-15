import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { handleImageUpload } from '@/lib/imageHandler';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const id = formData.get('id') as string | null;

    if (!file || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: image and id' },
        { status: 400 }
      );
    }

    if (typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const result = await handleImageUpload(file, id.trim(), 'sound', pool);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    console.error('[sound/upload]', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('not found') ? 404 : 500 }
    );
  }
}
