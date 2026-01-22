const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface FoodAnalysis {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function analyzeFood(imageBase64: string): Promise<FoodAnalysis> {
  if (!OPENAI_API_KEY) {
    // Return mock data if no API key
    console.warn('No OPENAI_API_KEY set, returning mock data');
    return {
      food_name: 'Unknown food',
      calories: 300,
      protein: 15,
      carbs: 30,
      fat: 10,
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this food photo and estimate the nutritional content. Be specific about the food items you see.

Return ONLY a JSON object in this exact format, no markdown or extra text:
{
  "food_name": "Brief description of the food (e.g., 'Grilled chicken salad with ranch dressing')",
  "calories": <number>,
  "protein": <grams as number>,
  "carbs": <grams as number>,
  "fat": <grams as number>
}

Be realistic with portion sizes and calorie estimates. If you can't identify the food clearly, make your best guess.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';
  
  // Parse JSON from response, handling potential markdown code blocks
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  try {
    const result = JSON.parse(jsonStr);
    return {
      food_name: result.food_name || 'Unknown food',
      calories: Math.round(result.calories) || 0,
      protein: Math.round(result.protein) || 0,
      carbs: Math.round(result.carbs) || 0,
      fat: Math.round(result.fat) || 0,
    };
  } catch (e) {
    console.error('Failed to parse OpenAI response:', content);
    return {
      food_name: 'Unknown food',
      calories: 300,
      protein: 15,
      carbs: 30,
      fat: 10,
    };
  }
}

export function categorizeMealByTime(date: Date): 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' {
  const hours = date.getHours();
  
  if (hours >= 5 && hours < 10) return 'Breakfast';
  if (hours >= 11 && hours < 14) return 'Lunch';
  if (hours >= 17 && hours < 21) return 'Dinner';
  return 'Snack';
}
