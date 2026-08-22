import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for videos

function getFileCategory(type: string): 'image' | 'video' | null {
  if (ALLOWED_IMAGE_TYPES.includes(type)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(type)) return 'video';
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null; // 'product' | 'bumper'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const fileCategory = getFileCategory(file.type);
    if (!fileCategory) {
      return NextResponse.json({ success: false, error: 'Only image (JPG, PNG, WEBP, GIF) and video (MP4, WebM, MOV) files are allowed' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File size must be less than 50MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename to avoid overwriting existing files
    const fileExt = path.extname(file.name) || (fileCategory === 'video' ? '.mp4' : '.jpg');
    const cleanBaseName = path.basename(file.name, fileExt).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const prefix = category === 'bumper' ? 'bumper' : 'product';
    const fileName = `${prefix}-${cleanBaseName}-${Date.now()}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    await writeFile(filePath, buffer);

    // Return the relative URL path to save in DB (e.g., /uploads/bumper-offer-170000000.mp4)
    const publicPath = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicPath,
      fileName,
      type: fileCategory,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}
