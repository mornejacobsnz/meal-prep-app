import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { Recipe } from '@/lib/types'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { recipes, lunchServings, dinnerServings } = await req.json() as { recipes: Recipe[]; lunchServings: number; dinnerServings: number }

    const recipeList = recipes.map(r => {
      const servings = r.mealType.includes('lunch') ? lunchServings : dinnerServings
      return {
        name: r.name,
        mealType: r.mealType.join('/'),
        servings,
        totalTime: r.totalTime,
        ingredients: r.ingredients.map(i => `${i.quantity}${i.unit} ${i.name}`).join(', '),
        steps: r.steps,
      }
    })

    const prompt = `You are a professional meal prep coach. Given a list of recipes for the week, generate a practical batch cooking session guide.

Recipes to prep (scaled per meal type — lunches for ${lunchServings} people, dinners for ${dinnerServings} people):
${recipeList.map((r, i) => `
${i + 1}. ${r.name} [${r.mealType}, ${r.servings} servings] (${r.totalTime} min total)
   Ingredients: ${r.ingredients}
   Steps: ${r.steps.join(' | ')}
`).join('')}

Generate a structured prep guide in this exact JSON format:
{
  "sessionTime": "<estimated total prep session time, e.g. '2.5 hours'>",
  "intro": "<1-2 sentence overview of the session>",
  "phases": [
    {
      "title": "<phase name, e.g. 'Start First (longest cook)'>",
      "emoji": "<single emoji>",
      "items": [
        {
          "task": "<clear action>",
          "note": "<optional tip or why>"
        }
      ]
    }
  ],
  "storage": [
    {
      "recipe": "<recipe name>",
      "container": "<best container type>",
      "fridge": "<days in fridge>",
      "freezer": "<days in freezer or 'not recommended'>",
      "reheat": "<best way to reheat>"
    }
  ],
  "proTips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}

Focus on:
- What to start first (long cook times / oven items)
- What can be prepped simultaneously (chopping while something cooks)
- Shared ingredients to batch prep once (e.g. if multiple recipes use onion, dice all at once)
- Realistic timing and practical tips
- Keep it actionable and concise`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const guide = JSON.parse(jsonMatch[0])
    return NextResponse.json({ guide })
  } catch (error) {
    console.error('Prep guide error:', error)
    return NextResponse.json({ error: 'Failed to generate prep guide' }, { status: 500 })
  }
}
