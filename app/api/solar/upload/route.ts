import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { handleImageUpload } from '@/lib/imageHandler';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const id = formData.get('id') as string;

    if (!file) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const result = await handleImageUpload(file, id, 'solar', pool);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' }, 
      { status: 500 }
    );
  }
}

