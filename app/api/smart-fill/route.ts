import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { Recipe, DayOfWeek, MealType, TasteMemory, AppSettings } from '@/lib/types'

const getClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

export async function POST(req: NextRequest) {
  try {
    const { tasteMemory, settings, mood = '', favouriteNames = [] } = await req.json() as {
      tasteMemory: TasteMemory
      settings: AppSettings
      mood?: string
      favouriteNames?: string[]
    }

    const { activeDays, filters, weeklyBudgetNZD, lunchServings, dinnerServings } = settings
    const budgetPerMeal = weeklyBudgetNZD / (activeDays.length * 2)

    const mealSlots: { day: DayOfWeek; mealType: MealType }[] = []
    activeDays.forEach(day => {
      if (filters.mealType === 'both' || filters.mealType === 'lunch') mealSlots.push({ day, mealType: 'lunch' })
      if (filters.mealType === 'both' || filters.mealType === 'dinner') mealSlots.push({ day, mealType: 'dinner' })
    })

    const tagList: string[] = []
    if (filters.simple) tagList.push('simple')
    if (filters.under30min) tagList.push('under 30 minutes total')
    if (filters.kidFriendly) tagList.push('kid-friendly')
    if (filters.mealPrepFriendly) tagList.push('batch-cookable, stores well 3-5 days')

    const dietInstruction = filters.dietType === 'vegetarian'
      ? 'ALL recipes must be fully vegetarian.'
      : filters.dietType === 'meat'
      ? 'ALL recipes must include meat, poultry, or seafood.'
      : ''

    const favouritesContext = favouriteNames.length > 0
      ? `Saved favourites (strong preference — recreate similar style/dishes): ${favouriteNames.slice(0, 20).join(', ')}`
      : ''
    const likedContext = tasteMemory.liked.length > 0
      ? `Liked recipes (use as inspiration, similar style): ${tasteMemory.liked.slice(0, 15).join(', ')}`
      : ''
    const dislikedContext = tasteMemory.disliked.length > 0
      ? `Disliked recipes (avoid these and similar): ${tasteMemory.disliked.slice(0, 15).join(', ')}`
      : ''
    const likedIngredients = tasteMemory.likedIngredients.length > 0
      ? `Favoured ingredients: ${tasteMemory.likedIngredients.slice(0, 20).join(', ')}`
      : ''
    const dislikedIngredients = tasteMemory.dislikedIngredients.length > 0
      ? `Ingredients to avoid: ${tasteMemory.dislikedIngredients.slice(0, 20).join(', ')}`
      : ''

    const slotsDescription = activeDays.map(day => {
      const daySlots = mealSlots.filter(s => s.day === day).map(s => s.mealType)
      return `${day}: ${daySlots.join(' + ')}`
    }).join(', ')

    const totalRecipes = mealSlots.length

    const prompt = `You are a smart meal planning AI. Generate a personalised weekly meal plan.

User profile:
${favouritesContext}
${likedContext}
${dislikedContext}
${likedIngredients}
${dislikedIngredients}

Plan requirements:
- Days to fill: ${slotsDescription}
- Budget: NZD $${budgetPerMeal.toFixed(2)} per meal
- Servings: ${lunchServings} for lunch, ${dinnerServings} for dinner
- Tags: ${tagList.length > 0 ? tagList.join(', ') : 'no restrictions'}
- ${dietInstruction}
- No recipe should appear more than once in the week
- Ensure variety across the week (different proteins, cuisines, cooking styles)
- If liked recipes/ingredients exist, lean toward that style
${mood ? `- This week's vibe/mood: ${mood} — this is the most important instruction, lean strongly into it` : ''}

Generate exactly ${totalRecipes} unique recipes and assign them to slots.

Return ONLY a valid JSON array of ${totalRecipes} recipe objects with an additional "assignedDay" and "assignedMealType" field. Each recipe must follow this exact structure:
{
  "id": "unique-kebab-case-id",
  "name": "Recipe Name",
  "description": "One sentence description",
  "mealType": ["lunch"] or ["dinner"],
  "assignedDay": "Monday",
  "assignedMealType": "lunch",
  "prepTime": <minutes>,
  "cookTime": <minutes>,
  "totalTime": <minutes>,
  "servings": <use ${lunchServings} for lunch or ${dinnerServings} for dinner>,
  "estimatedCostNZD": <total cost NZD for all servings>,
  "ingredients": [
    { "name": "ingredient", "quantity": 500, "unit": "g", "estimatedCostNZD": 2.50 }
  ],
  "steps": ["Step 1...", "Step 2..."],
  "tags": ["simple","under-30-min","kid-friendly","meal-prep-friendly"] (only applicable),
  "nutrition": { "calories": 450, "protein": "35g", "carbs": "40g", "fat": "12g" },
  "createdAt": "${new Date().toISOString()}"
}

Slots to fill: ${mealSlots.map(s => `${s.day} ${s.mealType}`).join(', ')}

UNIT RULES — follow exactly:
- Meat, fish, tofu, halloumi: always "g"
- Vegetables by weight (spinach, broccoli, mushrooms): always "g"
- Whole items (onion, egg, potato, carrot, capsicum, avocado, tomato, lemon, lime, zucchini): always "whole"
- Garlic: always "cloves" — never grams or whole
- Liquids (water, stock, milk, cream, sauces, oil): always "ml"
- Dry spices and powders: always "tsp" or "tbsp"
- Rice, pasta, oats, lentils, flour: always "g"
- Canned goods: always "g"
- Bread, wraps, tortillas: always "slices" or "pieces"

Use realistic NZD supermarket prices. Make it feel like a thoughtful human meal planner chose these.`

    const message = await getClient().chat.completions.create({
      model: 'openai/gpt-oss-20b:free',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.choices[0]?.message?.content ?? ''
    const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/\/\/[^\n]*/g, '')
    const jsonMatch = stripped.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found in response')

    const assignedRecipes: (Recipe & { assignedDay: DayOfWeek; assignedMealType: MealType })[] = JSON.parse(jsonMatch[0])

    return NextResponse.json({ assignedRecipes })
  } catch (error) {
    console.error('Smart fill error:', error)
    return NextResponse.json({ error: 'Failed to generate smart plan' }, { status: 500 })
  }
}
