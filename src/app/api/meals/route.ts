import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import ExifReader from 'exifreader';
import { createMeal, getMealsByDate } from '@/lib/db';
import { analyzeFood, categorizeMealByTime } from '@/lib/analyze-food';

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
    
    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Parse EXIF data for timestamp
    let photoDate = new Date();
    let photoTakenAt: string | null = null;
    
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

    // Save file
    const id = uuidv4();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${id}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Analyze food with OpenAI Vision
    const analysis = await analyzeFood(base64);

    // Categorize meal by time
    const mealType = categorizeMealByTime(photoDate);
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
