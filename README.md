# CalorieSnap 🍎

AI-powered calorie tracking from food photos. Upload a photo of your meal, and CalorieSnap uses GPT-4 Vision to identify the food and estimate nutritional information.

## Features

- 📷 **Photo Analysis**: Upload food photos and get instant calorie/macro estimates
- ⏰ **Auto-Categorization**: Uses EXIF timestamp to categorize meals (Breakfast, Lunch, Dinner, Snack)
- 📊 **Daily Tracking**: View daily totals for calories, protein, carbs, and fat
- ✏️ **Manual Editing**: Adjust AI estimates as needed
- 📱 **iOS Shortcut Ready**: POST photos via iOS Shortcuts for automatic tracking

## Tech Stack

- **Next.js 14** with TypeScript
- **SQLite** (better-sqlite3) for local data storage
- **Tailwind CSS** for styling
- **OpenAI GPT-4 Vision** for food analysis
- **EXIF parsing** for photo timestamps

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

```bash
export OPENAI_API_KEY=your-api-key-here
```

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## API Endpoints

### POST /api/meals
Upload a food photo for analysis.

```bash
curl -X POST -F "photo=@food.jpg" http://localhost:3000/api/meals
```

### GET /api/meals?date=YYYY-MM-DD
Get all meals for a specific date.

### PATCH /api/meals/[id]
Update a meal's information.

```json
{
  "food_name": "Updated name",
  "calories": 500,
  "protein": 25,
  "carbs": 40,
  "fat": 15,
  "meal_type": "Lunch",
  "notes": "Added sauce"
}
```

### DELETE /api/meals/[id]
Delete a meal and its photo.

### GET /api/images/[filename]
Serve uploaded images.

## iOS Shortcut Integration

Create an iOS Shortcut that:
1. Gets photos from your library
2. POSTs each photo to `https://your-domain.com/api/meals`
3. Runs automatically via Personal Automation

## Railway Deployment

1. Connect your GitHub repo to Railway
2. Add environment variable: `OPENAI_API_KEY`
3. Add a volume mounted at `/data` for SQLite database and uploads
4. Deploy!

## File Storage

- **Development**: Photos stored in `public/uploads/`, DB in project root
- **Production**: Photos stored in `/data/uploads/`, DB at `/data/calories.db`

## Meal Categorization

Based on photo timestamp (EXIF DateTimeOriginal):
- **Breakfast**: 5:00 AM - 9:59 AM
- **Lunch**: 11:00 AM - 1:59 PM
- **Dinner**: 5:00 PM - 8:59 PM
- **Snack**: All other times
