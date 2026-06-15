'use client'
import { WeeklyPlan, Recipe, DayOfWeek } from '@/lib/types'
import { storage, CarryOverRecipe } from '@/lib/storage'
import { useState, useEffect } from 'react'
import { ChefHat, Clock, Lightbulb, Loader2, CheckCircle2, Circle, RotateCcw, AlertCircle, ChevronDown, ChevronUp, Users } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
  activeDays: DayOfWeek[]
  lunchServings: number
  dinnerServings: number
}

interface RecipeCard {
  name: string
  mealType: string
  servings: number
  prepTime: string
  cookTime: string
  difficulty: string
  ingredients: { amount: string; item: string }[]
  steps: { n: number; title: string; detail: string }[]
  tip: string
}

interface PlanGuide {
  recipes: RecipeCard[]
}

export default function PrepGuide({ plan, activeDays, lunchServings, dinnerServings }: Props) {
  const [guide, setGuide] = useState<PlanGuide | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [carryOvers, setCarryOvers] = useState<CarryOverRecipe[]>([])
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    const saved = storage.getPlanGuideState()
    if (saved) {
      setGuide(saved.guide)
      setCompletedIds(new Set(saved.completedRecipeIds))
      setCarryOvers(saved.carryOverRecipes ?? [])
    }
  }, [])

  const toggleComplete = (recipeId: string) => {
    const updated = new Set(completedIds)
    if (updated.has(recipeId)) updated.delete(recipeId)
    else updated.add(recipeId)
    setCompletedIds(updated)
    const saved = storage.getPlanGuideState()
    if (saved) storage.savePlanGuideState({ ...saved, completedRecipeIds: Array.from(updated) })
  }

  const toggleCard = (name: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const generateGuide = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prep-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: uniqueRecipes, lunchServings, dinnerServings }),
      })
      if (!res.ok) throw new Error('Failed')
      const { guide: g } = await res.json()
      setGuide(g)
      setCompletedIds(new Set())
      const prev = storage.getPlanGuideState()
      const existingCarryOvers = (prev?.carryOverRecipes ?? []).filter(
        co => !uniqueRecipes.find(r => r.id === co.id)
      )
      setCarryOvers(existingCarryOvers)
      storage.savePlanGuideState({
        guide: g,
        completedRecipeIds: [],
        lockedAt: new Date().toISOString(),
        carryOverRecipes: existingCarryOvers,
      })
      // Auto-expand first card
      if (g.recipes?.length > 0) setExpandedCards(new Set([g.recipes[0].name]))
    } catch {
      setError('Could not generate guide. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNewWeek = () => {
    const unfinished: CarryOverRecipe[] = uniqueRecipes
      .filter(r => !completedIds.has(r.id))
      .map(r => ({ id: r.id, name: r.name, slots: recipeSlotMap.get(r.id) ?? [] }))
    storage.savePlanGuideState({
      guide: null,
      completedRecipeIds: [],
      lockedAt: new Date().toISOString(),
      carryOverRecipes: unfinished,
    })
    setGuide(null)
    setCompletedIds(new Set())
    setCarryOvers(unfinished)
  }

  if (filledSlots.length === 0 && carryOvers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-6 text-center">
        <ChefHat size={44} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">Your planner is empty</p>
        <p className="text-xs mt-1 opacity-70">Add meals to your week plan first, then come back here for your plan guide.</p>
      </div>
    )
  }

  const pendingRecipes = uniqueRecipes.filter(r => !completedIds.has(r.id))
  const doneRecipes = uniqueRecipes.filter(r => completedIds.has(r.id))

  return (
    <div className="space-y-4">
      {/* Carry-overs from last week */}
      {carryOvers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-amber-500" />
            <span className="font-semibold text-sm text-amber-800">Not made last week</span>
          </div>
          <ul className="space-y-1">
            {carryOvers.map(co => (
              <li key={co.id} className="text-xs text-amber-700 flex items-center gap-1.5">
                <span>•</span>
                <span>{co.name}</span>
                {co.slots.length > 0 && <span className="text-amber-400">({co.slots.join(', ')})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* This week's menu tick-off */}
      {uniqueRecipes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">This Week's Menu</h2>
            {guide && (
              <button onClick={handleNewWeek} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <RotateCcw size={11} />
                New week
              </button>
            )}
          </div>

          <div className="space-y-2">
            {pendingRecipes.map(recipe => {
              const slots = recipeSlotMap.get(recipe.id) ?? []
              const count = filledSlots.filter(s => s.recipe?.id === recipe.id).length
              return (
                <div key={recipe.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleComplete(recipe.id)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-emerald-500 transition-colors">
                      <Circle size={18} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug">{recipe.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{slots.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} />
                        {recipe.totalTime}m
                      </span>
                      {count > 1 && <span className="bg-violet-100 text-violet-600 text-xs font-bold px-2 py-0.5 rounded-full">×{count}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {doneRecipes.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Done</p>
              {doneRecipes.map(recipe => (
                <div key={recipe.id} className="bg-gray-50 rounded-2xl border border-gray-100 p-3.5 opacity-60">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleComplete(recipe.id)} className="mt-0.5 flex-shrink-0 text-emerald-500 hover:text-gray-300 transition-colors">
                      <CheckCircle2 size={18} />
                    </button>
                    <p className="font-medium text-gray-500 text-sm line-through leading-snug">{recipe.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      {!guide ? (
        <button
          onClick={generateGuide}
          disabled={loading || uniqueRecipes.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm shadow-sm hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Building your plan guide...</>
          ) : (
            <><ChefHat size={16} />Generate Plan Guide</>
          )}
        </button>
      ) : null}

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      {/* Recipe cards */}
      {guide && guide.recipes && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900">Recipe Cards</h2>

          {guide.recipes.map((card: RecipeCard) => {
            const isExpanded = expandedCards.has(card.name)
            return (
              <div key={card.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => toggleCard(card.name)}
                  className="w-full flex items-start gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-snug">{card.name}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} />
                        {card.prepTime} prep · {card.cookTime} cook
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users size={11} />
                        {card.servings} servings
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        card.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700'
                        : card.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                        {card.difficulty}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-50">
                    {/* Ingredients */}
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredients</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {card.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-xs font-bold text-gray-700 flex-shrink-0 min-w-[44px]">{ing.amount}</span>
                            <span className="text-xs text-gray-500 leading-snug">{ing.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="border-t border-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Method</p>
                      <div className="space-y-4">
                        {card.steps.map((step) => (
                          <div key={step.n} className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                              {step.n}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 mb-0.5">{step.title}</p>
                              <p className="text-xs text-gray-500 leading-relaxed">{step.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tip */}
                    {card.tip && (
                      <div className="border-t border-gray-50 px-4 py-3 bg-amber-50">
                        <div className="flex items-start gap-2">
                          <Lightbulb size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 leading-snug">{card.tip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

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
