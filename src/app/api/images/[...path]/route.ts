import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

function getUploadsDir() {
  return isProd ? '/data/uploads' : path.join(process.cwd(), 'public', 'uploads');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const uploadsDir = getUploadsDir();
    const filename = params.path.join('/');
    const filePath = path.join(uploadsDir, filename);
    
    // Security: ensure the path doesn't escape uploads directory
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.heic') contentType = 'image/heic';
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}
