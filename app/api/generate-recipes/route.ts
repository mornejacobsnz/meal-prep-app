import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { Recipe, Filters, TasteMemory } from '@/lib/types'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { filters, budgetPerMeal, lunchServings, dinnerServings, tasteMemory, mood = '', count = 6, exclude = [] } = await req.json() as {
      filters: Filters
      budgetPerMeal: number
      lunchServings: number
      dinnerServings: number
      tasteMemory: TasteMemory
      mood?: string
      count?: number
      exclude?: string[]
    }

    const tagList: string[] = []
    if (filters.simple) tagList.push('simple (minimal techniques, few ingredients)')
    if (filters.under30min) tagList.push('quick — strict 30 minute or less total time from start to plate including prep and cook')
    if (filters.kidFriendly) tagList.push('kid-friendly')
    if (filters.mealPrepFriendly) tagList.push('meal-prep friendly (batch-cookable, stores well in fridge/freezer for 3-5 days, reheats easily)')

    const isBoth = filters.mealType === 'both'
    const mealTypeText = isBoth ? 'meal prep'
      : filters.mealType === 'lunch' ? 'lunches' : 'dinners'

    const likedContext = tasteMemory.liked.length > 0
      ? `\nPreviously liked recipes: ${tasteMemory.liked.slice(0, 10).join(', ')}`
      : ''
    const dislikedContext = tasteMemory.disliked.length > 0
      ? `\nRecipes to avoid (previously disliked): ${tasteMemory.disliked.slice(0, 10).join(', ')}`
      : ''
    const dislikedIngredients = tasteMemory.dislikedIngredients.length > 0
      ? `\nIngredients to avoid: ${tasteMemory.dislikedIngredients.slice(0, 15).join(', ')}`
      : ''
    const likedIngredients = tasteMemory.likedIngredients.length > 0
      ? `\nFavoured ingredients: ${tasteMemory.likedIngredients.slice(0, 15).join(', ')}`
      : ''

    const dietInstruction = filters.dietType === 'vegetarian'
      ? '- ALL recipes must be fully vegetarian (no meat, no fish, no seafood)'
      : filters.dietType === 'meat'
      ? '- ALL recipes must include meat, poultry, or seafood as a main ingredient'
      : ''

    const splitInstruction = isBoth
      ? `- Generate EXACTLY 5 lunch recipes and EXACTLY 5 dinner recipes (10 total). Lunch recipes must have mealType: ["lunch"] and dinner recipes must have mealType: ["dinner"].`
      : `- Generate ${count} ${mealTypeText} recipes. Each must have mealType: ["${filters.mealType}"].`

    const prompt = `Generate ${isBoth ? 10 : count} varied ${mealTypeText} recipes for weekly meal prep.

Requirements:
${splitInstruction}
${dietInstruction}
- Budget: NZD $${budgetPerMeal.toFixed(2)} per meal
- Tags required: ${tagList.length > 0 ? tagList.join(', ') : 'no specific restrictions'}
- Servings: ${lunchServings} for lunch recipes, ${dinnerServings} for dinner recipes
${likedContext}${dislikedContext}${likedIngredients}${dislikedIngredients}${mood ? `\nThis week's vibe/mood: ${mood} — lean strongly into this when choosing recipes.` : ''}${exclude.length > 0 ? `\nDo NOT generate any of these recipes (already shown): ${exclude.join(', ')}` : ''}

Return ONLY a valid JSON array. Each recipe must follow this exact structure:
{
  "id": "unique-kebab-case-id",
  "name": "Recipe Name",
  "description": "One sentence description",
  "mealType": ["lunch"] or ["dinner"],
  "prepTime": <minutes>,
  "cookTime": <minutes>,
  "totalTime": <minutes>,
  "servings": <use ${lunchServings} for lunch or ${dinnerServings} for dinner>,
  "estimatedCostNZD": <total cost in NZD for all servings>,
  "ingredients": [
    { "name": "ingredient", "quantity": 500, "unit": "g", "estimatedCostNZD": 2.50 }
  ],
  "steps": ["Step 1...", "Step 2..."],
  "tags": ["simple","quick","under-30-min","kid-friendly"] (include only applicable tags),
  "nutrition": { "calories": 450, "protein": "35g", "carbs": "40g", "fat": "12g" },
  "createdAt": "${new Date().toISOString()}"
}

UNIT RULES — follow these exactly, no exceptions:
- Meat, fish, tofu, halloumi: always "g"
- Vegetables sold by weight (spinach, broccoli, cabbage, mushrooms): always "g"
- Whole items (onion, egg, potato, carrot, capsicum, avocado, tomato, lemon, lime, zucchini): always "whole"
- Garlic: always "cloves" — NEVER grams or whole
- Liquids (water, stock, milk, cream, sauces, oil): always "ml"
- Dry spices and powders: always "tsp" or "tbsp"
- Rice, pasta, oats, lentils, flour, sugar: always "g"
- Canned goods (tomatoes, beans, coconut milk): always "g"
- Bread, wraps, tortillas: always "slices" or "pieces"

Nutrition values must be PER SERVING (per person), not totals for the whole batch.
Use realistic NZD supermarket prices. Keep recipes practical, delicious, and varied. No duplicate recipes from the liked list.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found in response')

    // Strip JS-style comments the model occasionally includes (invalid in JSON)
    const cleaned = jsonMatch[0].replace(/\/\/[^\n]*/g, '')
    const recipes: Recipe[] = JSON.parse(cleaned)
    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('Recipe generation error:', error)
    return NextResponse.json({ error: 'Failed to generate recipes' }, { status: 500 })
  }
}
