import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import ExifReader from 'exifreader';
import { createMeal, getMealsByDate } from '@/lib/db';
import { analyzeFood, categorizeMealByTime } from '@/lib/analyze-food';
import convert from 'heic-convert';
import sharp from 'sharp';

const isProd = process.env.NODE_ENV === 'production';

function getUploadsDir() {
  return isProd ? '/data/uploads' : path.join(process.cwd(), 'public', 'uploads');
}

function ensureUploadsDir() {
  const uploadsDir = getUploadsDir();
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  
  const meals = getMealsByDate(date);
  return NextResponse.json(meals);
}

export async function POST(request: NextRequest) {
  try {
    const uploadsDir = ensureUploadsDir();
    
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const clientTimestamp = formData.get('timestamp') as string | null;
    const clientHour = formData.get('hour') as string | null; // Local hour (0-23)
    
    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    
    // Convert HEIC to JPEG if needed
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      console.log('Converting HEIC to JPEG...');
      const jpegBuffer = await convert({
        buffer: buffer,
        format: 'JPEG',
        quality: 0.9
      });
      buffer = Buffer.from(jpegBuffer);
    }
    
    // Ensure image is in a compatible format and reasonable size
    const processedImage = await sharp(buffer)
      .jpeg({ quality: 85 })
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    
    buffer = processedImage;
    const base64 = buffer.toString('base64');

    // Determine photo timestamp
    let photoDate = new Date();
    let photoTakenAt: string | null = null;
    
    // Priority 1: Client-provided timestamp (from iOS Shortcut)
    if (clientTimestamp) {
      photoDate = new Date(clientTimestamp);
      photoTakenAt = photoDate.toISOString();
      console.log('Using client timestamp:', clientTimestamp);
    } else {
      // Priority 2: Try EXIF data
      try {
        const tags = ExifReader.load(buffer);
        const dateTimeOriginal = tags['DateTimeOriginal']?.description;
        
        if (dateTimeOriginal) {
          // EXIF format: "2024:01:15 12:30:45"
          const [datePart, timePart] = dateTimeOriginal.split(' ');
          const [year, month, day] = datePart.split(':');
          const [hour, minute, second] = timePart.split(':');
          photoDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
          );
          photoTakenAt = photoDate.toISOString();
        }
      } catch (e) {
        console.log('No EXIF data found, using current time');
      }
    }

    // Save file (always as JPEG since we converted)
    const id = uuidv4();
    const filename = `${id}.jpg`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Analyze food with OpenAI Vision
    const analysis = await analyzeFood(base64);

    // Categorize meal by time (use client hour if provided for correct timezone)
    let mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    if (clientHour) {
      const hour = parseInt(clientHour);
      if (hour >= 5 && hour < 10) mealType = 'Breakfast';
      else if (hour >= 11 && hour < 14) mealType = 'Lunch';
      else if (hour >= 17 && hour < 21) mealType = 'Dinner';
      else mealType = 'Snack';
      console.log('Using client hour for categorization:', hour, '→', mealType);
    } else {
      mealType = categorizeMealByTime(photoDate);
    }
    const dateStr = format(photoDate, 'yyyy-MM-dd');

    // Create meal record
    const meal = createMeal({
      id,
      date: dateStr,
      meal_type: mealType,
      photo_path: filename,
      food_name: analysis.food_name,
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      notes: '',
      photo_taken_at: photoTakenAt,
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error('Error processing meal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process meal', details: errorMessage },
      { status: 500 }
    );
  }
}
