import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { Recipe } from '@/lib/types'

const getClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

export async function POST(req: NextRequest) {
  try {
    const { recipes, lunchServings, dinnerServings } = await req.json() as { recipes: Recipe[]; lunchServings: number; dinnerServings: number }

    const recipeList = recipes.map(r => {
      const servings = r.mealType.includes('lunch') ? lunchServings : dinnerServings
      return {
        name: r.name,
        mealType: r.mealType.join('/'),
        servings,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        totalTime: r.totalTime,
        ingredients: r.ingredients.map(i => `${i.quantity}${i.unit} ${i.name}`),
        steps: r.steps,
      }
    })

    const prompt = `You are a meal kit recipe writer like HelloFresh or Dinnerly. Given a list of recipes, generate a clear, friendly recipe card for each one — exactly as you'd find in a meal kit box.

Recipes (lunches scaled for ${lunchServings} people, dinners for ${dinnerServings} people):
${recipeList.map((r, i) => `
${i + 1}. ${r.name} [${r.mealType}, ${r.servings} servings]
   Prep: ${r.prepTime} min | Cook: ${r.cookTime} min | Total: ${r.totalTime} min
   Ingredients: ${r.ingredients.join(', ')}
   Original steps: ${r.steps.join(' | ')}
`).join('')}

Generate a JSON object with a "recipes" array. Each entry must follow this exact format:
{
  "recipes": [
    {
      "name": "<recipe name>",
      "mealType": "<lunch or dinner>",
      "servings": <number>,
      "prepTime": "<e.g. 10 mins>",
      "cookTime": "<e.g. 20 mins>",
      "difficulty": "<Easy | Medium | Tricky>",
      "ingredients": [
        { "amount": "<e.g. 600g>", "item": "<e.g. chicken breast, diced>" }
      ],
      "steps": [
        { "n": 1, "title": "<short step title, 3-5 words>", "detail": "<clear friendly instruction, 1-3 sentences. Mention exact times, temperatures, visual cues.>" }
      ],
      "tip": "<one practical chef tip specific to this dish>"
    }
  ]
}

Rules:
- Rewrite the steps in a warm, clear meal-kit style (like HelloFresh). Each step should be actionable and self-contained.
- Step titles are short and punchy: "Prep the veg", "Sear the chicken", "Make the sauce"
- Ingredients list should match what someone needs to pull out — include prep notes in the item name (e.g. "red onion, finely diced")
- 4-7 steps per recipe
- Keep tip practical and specific to the dish, not generic cooking advice
- Return ONLY the JSON, no other text`

    const message = await getClient().chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.choices[0]?.message?.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const guide = JSON.parse(jsonMatch[0])
    return NextResponse.json({ guide })
  } catch (error) {
    console.error('Prep guide error:', error)
    return NextResponse.json({ error: 'Failed to generate plan guide' }, { status: 500 })
  }
}
