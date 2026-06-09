import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { Recipe, Filters, TasteMemory } from '@/lib/types'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { filters, budgetPerMeal, servings, tasteMemory, count = 6 } = await req.json() as {
      filters: Filters
      budgetPerMeal: number
      servings: number
      tasteMemory: TasteMemory
      count?: number
    }

    const tagList: string[] = []
    if (filters.simple) tagList.push('simple (minimal techniques, few ingredients)')
    if (filters.quick) tagList.push('quick to make')
    if (filters.under30min) tagList.push('under 30 minutes total')
    if (filters.kidFriendly) tagList.push('kid-friendly')

    const mealTypeText = filters.mealType === 'both' ? 'lunches and dinners' :
      filters.mealType === 'lunch' ? 'lunches' : 'dinners'

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

    const prompt = `Generate ${count} varied meal prep recipe suggestions for ${mealTypeText}.

Requirements:
- Budget: NZD $${budgetPerMeal.toFixed(2)} per meal (for ${servings} servings)
- Tags required: ${tagList.length > 0 ? tagList.join(', ') : 'no specific restrictions'}
- Servings: ${servings} people
${likedContext}${dislikedContext}${likedIngredients}${dislikedIngredients}

Return ONLY a valid JSON array of ${count} recipes. Each recipe must follow this exact structure:
{
  "id": "unique-kebab-case-id",
  "name": "Recipe Name",
  "description": "One sentence description",
  "mealType": ["lunch"] or ["dinner"] or ["lunch","dinner"],
  "prepTime": <minutes>,
  "cookTime": <minutes>,
  "totalTime": <minutes>,
  "servings": ${servings},
  "estimatedCostNZD": <total cost in NZD for all servings>,
  "ingredients": [
    { "name": "ingredient", "quantity": 500, "unit": "g", "estimatedCostNZD": 2.50 }
  ],
  "steps": ["Step 1...", "Step 2..."],
  "tags": ["simple","quick","under-30-min","kid-friendly"] (include only applicable tags),
  "nutrition": { "calories": 450, "protein": "35g", "carbs": "40g", "fat": "12g" },
  "createdAt": "${new Date().toISOString()}"
}

Use realistic NZD supermarket prices. Keep recipes practical, delicious, and varied. No duplicate recipes from the liked list.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found in response')

    const recipes: Recipe[] = JSON.parse(jsonMatch[0])
    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('Recipe generation error:', error)
    return NextResponse.json({ error: 'Failed to generate recipes' }, { status: 500 })
  }
}
