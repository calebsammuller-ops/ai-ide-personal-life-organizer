import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

interface RecipeSuggestion {
  name: string
  description: string
  additionalIngredients: string[]
  estimatedTime: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface DietaryNote {
  type: 'warning' | 'info' | 'success'
  message: string
}

interface EnhancedFoodScanResult {
  items: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  mealName: string
  recipeSuggestions: RecipeSuggestion[]
  dietaryNotes: DietaryNote[]
  healthScore: number
  matchedDietaryGoals: string[]
  missingNutrients: string[]
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { image } = body // base64 encoded image

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Extract base64 data and media type
    const matches = image.match(/^data:(.+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid image format. Expected base64 data URL.' },
        { status: 400 }
      )
    }

    const mediaType = matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const imageData = matches[2]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: `Analyze this food image comprehensively. Return a JSON object with:

{
  "items": [
    {
      "name": "food item name",
      "portion": "estimated portion size (e.g., '1 cup', '200g')",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "fiber": number (grams)
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalFiber": number,
  "mealName": "suggested name for this meal",
  "recipeSuggestions": [
    {
      "name": "Recipe name using these ingredients",
      "description": "Brief description",
      "additionalIngredients": ["ingredient 1", "ingredient 2"],
      "estimatedTime": minutes,
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "dietaryNotes": [
    {
      "type": "warning" | "info" | "success",
      "message": "Dietary observation or suggestion"
    }
  ],
  "healthScore": 1-10 (10 being healthiest, based on nutritional balance),
  "matchedDietaryGoals": ["high protein", "low carb", etc. if applicable],
  "missingNutrients": ["vitamin C", "fiber", etc. if notably absent]
}

GUIDELINES:
- Be thorough but concise
- Provide 1-3 recipe suggestions that could use these foods
- Include 2-4 dietary notes (mix of types)
- Health score should reflect nutritional balance, not just calories
- Be realistic with portion estimates based on what's visible
- Return ONLY the JSON object`,
            },
          ],
        },
      ],
    })

    // Extract the text response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to analyze image' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let result: EnhancedFoodScanResult
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      result = JSON.parse(jsonMatch[0])

      // Ensure all required fields have defaults
      result.recipeSuggestions = result.recipeSuggestions || []
      result.dietaryNotes = result.dietaryNotes || []
      result.healthScore = result.healthScore || 5
      result.matchedDietaryGoals = result.matchedDietaryGoals || []
      result.missingNutrients = result.missingNutrients || []
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse food analysis', raw: textContent.text },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Food scan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze food' },
      { status: 500 }
    )
  }
}
