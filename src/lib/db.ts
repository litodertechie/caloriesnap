import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isProd = process.env.NODE_ENV === 'production';

function getDbPath() {
  return isProd ? '/data/calories.db' : path.join(process.cwd(), 'calories.db');
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  
  const dbPath = getDbPath();
  
  // Ensure directory exists (only at runtime, not build time)
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(dbPath);

  // Initialize schema
  _db.exec(`
    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      photo_path TEXT NOT NULL,
      food_name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein INTEGER DEFAULT 0,
      carbs INTEGER DEFAULT 0,
      fat INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      photo_taken_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
  `);

  return _db;
}

export interface Meal {
  id: string;
  date: string;
  meal_type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  photo_path: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
  photo_taken_at: string | null;
  created_at: string;
}

export function getMealsByDate(date: string): Meal[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM meals WHERE date = ? ORDER BY photo_taken_at ASC, created_at ASC');
  return stmt.all(date) as Meal[];
}

export function getMealById(id: string): Meal | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM meals WHERE id = ?');
  return stmt.get(id) as Meal | null;
}

export function createMeal(meal: Omit<Meal, 'created_at'>): Meal {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO meals (id, date, meal_type, photo_path, food_name, calories, protein, carbs, fat, notes, photo_taken_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(meal.id, meal.date, meal.meal_type, meal.photo_path, meal.food_name, meal.calories, meal.protein, meal.carbs, meal.fat, meal.notes, meal.photo_taken_at);
  return getMealById(meal.id)!;
}

export function updateMeal(id: string, updates: Partial<Omit<Meal, 'id' | 'created_at'>>): Meal | null {
  const db = getDb();
  const current = getMealById(id);
  if (!current) return null;

  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return current;

  values.push(id);
  const stmt = db.prepare(`UPDATE meals SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getMealById(id);
}

export function deleteMeal(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM meals WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export default getDb;
