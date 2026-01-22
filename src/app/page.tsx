'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, addDays, parseISO } from 'date-fns';

interface Meal {
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

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export default function Home() {
  // Default to 2 days ago
  const [currentDate, setCurrentDate] = useState(() => 
    format(subDays(new Date(), 2), 'yyyy-MM-dd')
  );
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meals?date=${currentDate}`);
      const data = await res.json();
      setMeals(data);
    } catch (err) {
      console.error('Failed to fetch meals:', err);
    }
    setLoading(false);
  }, [currentDate]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await fetch('/api/meals', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const meal = await res.json();
      // If the meal's date matches current view, add it
      if (meal.date === currentDate) {
        setMeals(prev => [...prev, meal]);
      } else {
        // Navigate to the meal's date
        setCurrentDate(meal.date);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload photo');
    }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    
    if (imageFile) {
      handleUpload(imageFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meal?')) return;
    
    try {
      await fetch(`/api/meals/${id}`, { method: 'DELETE' });
      setMeals(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleUpdate = async (meal: Meal) => {
    try {
      const res = await fetch(`/api/meals/${meal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_name: meal.food_name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          meal_type: meal.meal_type,
          notes: meal.notes,
        }),
      });
      
      if (!res.ok) throw new Error('Update failed');
      
      const updated = await res.json();
      setMeals(prev => prev.map(m => m.id === updated.id ? updated : m));
      setEditingMeal(null);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const groupedMeals = MEAL_ORDER.reduce((acc, type) => {
    acc[type] = meals.filter(m => m.meal_type === type);
    return acc;
  }, {} as Record<string, Meal[]>);

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.fat, 0);

  const goToToday = () => setCurrentDate(format(new Date(), 'yyyy-MM-dd'));
  const goToPrev = () => setCurrentDate(format(subDays(parseISO(currentDate), 1), 'yyyy-MM-dd'));
  const goToNext = () => setCurrentDate(format(addDays(parseISO(currentDate), 1), 'yyyy-MM-dd'));

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-green-400">
        🍎 CalorieSnap
      </h1>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={goToPrev} className="btn btn-secondary">←</button>
        <button onClick={goToToday} className="btn btn-secondary text-sm">Today</button>
        <span className="text-xl font-medium min-w-[180px] text-center">
          {format(parseISO(currentDate), 'EEE, MMM d, yyyy')}
        </span>
        <button onClick={goToNext} className="btn btn-secondary">→</button>
      </div>

      {/* Daily Totals */}
      <div className="grid grid-cols-4 gap-3 mb-6 text-center">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">{totalCalories}</div>
          <div className="text-xs text-gray-400">Calories</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-400">{totalProtein}g</div>
          <div className="text-xs text-gray-400">Protein</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-400">{totalCarbs}g</div>
          <div className="text-xs text-gray-400">Carbs</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-400">{totalFat}g</div>
          <div className="text-xs text-gray-400">Fat</div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`drop-zone mb-6 ${dragging ? 'dragging' : ''} ${uploading ? 'opacity-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="text-green-400">Analyzing photo... 🔍</div>
        ) : (
          <>
            <div className="text-gray-400 mb-2">
              📷 Drag & drop a food photo here
            </div>
            <label className="btn btn-primary cursor-pointer inline-block">
              Or click to upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </>
        )}
      </div>

      {/* Meals by Category */}
      {loading ? (
        <div className="text-center text-gray-400">Loading meals...</div>
      ) : (
        <div className="space-y-6">
          {MEAL_ORDER.map(type => {
            const typeMeals = groupedMeals[type];
            if (typeMeals.length === 0) return null;
            
            const typeCalories = typeMeals.reduce((sum, m) => sum + m.calories, 0);
            
            return (
              <div key={type}>
                <h2 className="text-lg font-semibold mb-3 flex items-center justify-between">
                  <span>
                    {type === 'Breakfast' && '🌅'}
                    {type === 'Lunch' && '☀️'}
                    {type === 'Dinner' && '🌙'}
                    {type === 'Snack' && '🍿'}
                    {' '}{type}
                  </span>
                  <span className="text-sm text-gray-400">{typeCalories} cal</span>
                </h2>
                <div className="space-y-3">
                  {typeMeals.map(meal => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onEdit={() => setEditingMeal(meal)}
                      onDelete={() => handleDelete(meal.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          
          {meals.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No meals logged for this day.
              <br />Upload a food photo to get started!
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingMeal && (
        <EditModal
          meal={editingMeal}
          onSave={handleUpdate}
          onClose={() => setEditingMeal(null)}
        />
      )}
    </main>
  );
}

function MealCard({ 
  meal, 
  onEdit, 
  onDelete 
}: { 
  meal: Meal; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <div className="meal-card">
      <img
        src={`/api/images/${meal.photo_path}`}
        alt={meal.food_name}
        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white truncate">{meal.food_name}</h3>
        <div className="text-sm text-gray-400 mt-1">
          <span className="text-green-400 font-semibold">{meal.calories}</span> cal
          {' · '}<span className="text-blue-400">{meal.protein}g</span> P
          {' · '}<span className="text-yellow-400">{meal.carbs}g</span> C
          {' · '}<span className="text-red-400">{meal.fat}g</span> F
        </div>
        {meal.notes && (
          <div className="text-xs text-gray-500 mt-1 truncate">{meal.notes}</div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button onClick={onEdit} className="text-gray-400 hover:text-white p-1">✏️</button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-1">🗑️</button>
      </div>
    </div>
  );
}

function EditModal({ 
  meal, 
  onSave, 
  onClose 
}: { 
  meal: Meal; 
  onSave: (meal: Meal) => void; 
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...meal });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Meal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Food Name</label>
            <input
              type="text"
              value={form.food_name}
              onChange={(e) => setForm({ ...form, food_name: e.target.value })}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Meal Type</label>
            <select
              value={form.meal_type}
              onChange={(e) => setForm({ ...form, meal_type: e.target.value as any })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
            >
              {MEAL_ORDER.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Calories</label>
              <input
                type="number"
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: parseInt(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Protein</label>
              <input
                type="number"
                value={form.protein}
                onChange={(e) => setForm({ ...form, protein: parseInt(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Carbs</label>
              <input
                type="number"
                value={form.carbs}
                onChange={(e) => setForm({ ...form, carbs: parseInt(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fat</label>
              <input
                type="number"
                value={form.fat}
                onChange={(e) => setForm({ ...form, fat: parseInt(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full"
              rows={2}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
