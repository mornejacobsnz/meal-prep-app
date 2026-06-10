'use client'
import { WeeklyPlan, Recipe, DayOfWeek } from '@/lib/types'
import { useState } from 'react'
import { ChefHat, Clock, Refrigerator, Lightbulb, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
  activeDays: DayOfWeek[]
  servings: number
}

interface PrepGuide {
  sessionTime: string
  intro: string
  phases: { title: string; emoji: string; items: { task: string; note?: string }[] }[]
  storage: { recipe: string; container: string; fridge: string; freezer: string; reheat: string }[]
  proTips: string[]
}

export default function PrepGuide({ plan, activeDays, servings }: Props) {
  const [guide, setGuide] = useState<PrepGuide | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedStorage, setExpandedStorage] = useState(false)

  const filledSlots = plan.slots.filter(s => activeDays.includes(s.day) && s.recipe)
  const uniqueRecipes: Recipe[] = []
  const seen = new Set<string>()
  for (const slot of filledSlots) {
    if (slot.recipe && !seen.has(slot.recipe.id)) {
      seen.add(slot.recipe.id)
      uniqueRecipes.push(slot.recipe)
    }
  }

  const recipeSlotMap = new Map<string, string[]>()
  for (const slot of filledSlots) {
    if (!slot.recipe) continue
    const days = recipeSlotMap.get(slot.recipe.id) ?? []
    days.push(`${slot.day.slice(0, 3)} ${slot.mealType}`)
    recipeSlotMap.set(slot.recipe.id, days)
  }

  const generateGuide = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prep-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: uniqueRecipes, servings }),
      })
      if (!res.ok) throw new Error('Failed')
      const { guide: g } = await res.json()
      setGuide(g)
    } catch {
      setError('Could not generate guide. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (filledSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-6 text-center">
        <ChefHat size={44} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">Your planner is empty</p>
        <p className="text-xs mt-1 opacity-70">Add meals to your week plan first, then come back here for your prep guide.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* This week's menu */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">This Week's Menu</h2>
        <div className="space-y-2">
          {uniqueRecipes.map(recipe => {
            const slots = recipeSlotMap.get(recipe.id) ?? []
            const count = filledSlots.filter(s => s.recipe?.id === recipe.id).length
            return (
              <div key={recipe.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{recipe.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{slots.join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} />
                      {recipe.totalTime}m
                    </span>
                    {count > 1 && (
                      <span className="bg-violet-100 text-violet-600 text-xs font-bold px-2 py-0.5 rounded-full">×{count}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Generate guide button */}
      {!guide && (
        <button
          onClick={generateGuide}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm shadow-sm hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Building your prep guide...
            </>
          ) : (
            <>
              <ChefHat size={16} />
              Generate Batch Prep Guide
            </>
          )}
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Guide output */}
      {guide && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} />
              <span className="text-sm font-semibold">{guide.sessionTime} total session</span>
            </div>
            <p className="text-sm opacity-90 leading-snug">{guide.intro}</p>
          </div>

          {/* Phases */}
          {guide.phases.map((phase, pi) => (
            <div key={pi} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-base">{phase.emoji}</span>
                <span className="font-semibold text-sm text-gray-800">{phase.title}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {phase.items.map((item, ii) => (
                  <div key={ii} className="px-4 py-2.5">
                    <p className="text-sm text-gray-800 font-medium">{item.task}</p>
                    {item.note && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Storage */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStorage(!expandedStorage)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100"
            >
              <div className="flex items-center gap-2">
                <Refrigerator size={15} className="text-blue-500" />
                <span className="font-semibold text-sm text-gray-800">Storage Guide</span>
              </div>
              {expandedStorage ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {expandedStorage && (
              <div className="divide-y divide-gray-50">
                {guide.storage.map((s, si) => (
                  <div key={si} className="px-4 py-3 space-y-1">
                    <p className="text-sm font-semibold text-gray-800">{s.recipe}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span>📦 {s.container}</span>
                      <span>❄️ Fridge: {s.fridge}</span>
                      <span>🔥 Reheat: {s.reheat}</span>
                      <span>🧊 Freeze: {s.freezer}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pro tips */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Lightbulb size={14} className="text-amber-500" />
              <span className="font-semibold text-sm text-amber-800">Pro Tips</span>
            </div>
            <ul className="space-y-1.5">
              {guide.proTips.map((tip, ti) => (
                <li key={ti} className="text-xs text-amber-700 leading-snug flex gap-1.5">
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Regenerate */}
          <button
            onClick={generateGuide}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Regenerate guide
          </button>
        </div>
      )}
    </div>
  )
}
