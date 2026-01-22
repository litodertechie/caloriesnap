import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMealById, updateMeal, deleteMeal } from '@/lib/db';

const isProd = process.env.NODE_ENV === 'production';

function getUploadsDir() {
  return isProd ? '/data/uploads' : path.join(process.cwd(), 'public', 'uploads');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const meal = getMealById(params.id);
  if (!meal) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }
  return NextResponse.json(meal);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const meal = updateMeal(params.id, updates);
    
    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }
    
    return NextResponse.json(meal);
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meal = getMealById(params.id);
    
    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }
    
    // Delete the image file
    const uploadsDir = getUploadsDir();
    const imagePath = path.join(uploadsDir, meal.photo_path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    deleteMeal(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
}
