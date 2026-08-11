import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only image files are allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename to avoid overwriting existing files
    const fileExt = path.extname(file.name) || '.jpg';
    const cleanBaseName = path.basename(file.name, fileExt).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `product-${cleanBaseName}-${Date.now()}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    await writeFile(filePath, buffer);

    // Return the relative URL path to save in DB (e.g., /uploads/product-chicken-170000000.jpg)
    const publicPath = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicPath,
      fileName,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload image' }, { status: 500 });
  }
}
