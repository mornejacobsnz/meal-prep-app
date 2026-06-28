'use client'
import { WeeklyPlan, Recipe, DayOfWeek } from '@/lib/types'
import { storage, CarryOverRecipe } from '@/lib/storage'
import { useState, useEffect } from 'react'
import { ClipboardList, Lightbulb, CheckCircle2, Circle, RotateCcw, AlertCircle, ChevronDown, ChevronUp, Clock, Users } from 'lucide-react'

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

export default function PrepGuide({ plan, activeDays }: Props) {
  const [guide, setGuide] = useState<PlanGuide | null>(null)
  const [completedNames, setCompletedNames] = useState<Set<string>>(new Set())
  const [carryOvers, setCarryOvers] = useState<CarryOverRecipe[]>([])
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // For carry-over slot info
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
    if (saved?.guide?.recipes?.length) {
      setGuide(saved.guide)
      setCompletedNames(new Set(saved.completedRecipeIds))
      setCarryOvers(saved.carryOverRecipes ?? [])
      // Auto-expand first uncompleted card
      const firstPending = saved.guide.recipes.find((c: RecipeCard) => !saved.completedRecipeIds.includes(c.name))
      if (firstPending) setExpandedCards(new Set([firstPending.name]))
    } else {
      setCarryOvers(saved?.carryOverRecipes ?? [])
    }
  }, [])

  const toggleDone = (name: string) => {
    const updated = new Set(completedNames)
    if (updated.has(name)) updated.delete(name)
    else {
      updated.add(name)
      // Collapse done cards
      setExpandedCards(prev => { const n = new Set(prev); n.delete(name); return n })
    }
    setCompletedNames(updated)
    const saved = storage.getPlanGuideState()
    if (saved) storage.savePlanGuideState({ ...saved, completedRecipeIds: Array.from(updated) })
  }

  const toggleExpand = (name: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleNewWeek = () => {
    const cards = guide?.recipes ?? []
    const unfinished: CarryOverRecipe[] = cards
      .filter(c => !completedNames.has(c.name))
      .map(c => {
        const planRecipe = uniqueRecipes.find(r => r.name === c.name)
        return {
          id: planRecipe?.id ?? c.name,
          name: c.name,
          slots: planRecipe ? (recipeSlotMap.get(planRecipe.id) ?? []) : [],
        }
      })
    storage.savePlanGuideState({ guide: null, completedRecipeIds: [], lockedAt: new Date().toISOString(), carryOverRecipes: unfinished })
    setGuide(null)
    setCompletedNames(new Set())
    setCarryOvers(unfinished)
  }

  // No guide yet
  if (!guide?.recipes?.length) {
    return (
      <div className="space-y-4">
        {carryOvers.length > 0 && <CarryOverBanner carryOvers={carryOvers} />}
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-6 text-center">
          <ClipboardList size={44} className="mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">No guide yet</p>
          <p className="text-xs mt-1 opacity-70">Head to the Planner tab and tap <strong className="text-gray-500">Lock the Week</strong> to generate your recipe cards.</p>
        </div>
      </div>
    )
  }

  const pendingCards = guide.recipes.filter(c => !completedNames.has(c.name))
  const doneCards = guide.recipes.filter(c => completedNames.has(c.name))

  return (
    <div className="space-y-4">
      {carryOvers.length > 0 && <CarryOverBanner carryOvers={carryOvers} />}

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Recipe Cards</h2>
      </div>

      {/* Pending recipe cards */}
      <div className="space-y-3">
        {pendingCards.map(card => (
          <RecipeCardView
            key={card.name}
            card={card}
            done={false}
            expanded={expandedCards.has(card.name)}
            onToggleExpand={() => toggleExpand(card.name)}
            onToggleDone={() => toggleDone(card.name)}
          />
        ))}
      </div>

      {/* Done cards */}
      {doneCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Done</p>
          {doneCards.map(card => (
            <RecipeCardView
              key={card.name}
              card={card}
              done={true}
              expanded={expandedCards.has(card.name)}
              onToggleExpand={() => toggleExpand(card.name)}
              onToggleDone={() => toggleDone(card.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CarryOverBanner({ carryOvers }: { carryOvers: CarryOverRecipe[] }) {
  return (
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
  )
}

function RecipeCardView({ card, done, expanded, onToggleExpand, onToggleDone }: {
  card: RecipeCard
  done: boolean
  expanded: boolean
  onToggleExpand: () => void
  onToggleDone: () => void
}) {
  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm transition-opacity ${done ? 'opacity-50 border-gray-100 bg-gray-50' : 'border-gray-100 bg-white'}`}>
      {/* Header row */}
      <div className="flex items-start p-4 gap-3">
        <button onClick={onToggleDone} className={`flex-shrink-0 mt-0.5 transition-colors ${done ? 'text-emerald-500 hover:text-gray-300' : 'text-gray-300 hover:text-emerald-500'}`}>
          {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>
        <button onClick={onToggleExpand} className="flex-1 text-left min-w-0">
          <p className={`font-bold text-sm leading-snug ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{card.name}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              {card.prepTime} prep · {card.cookTime} cook
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={11} />
              {card.servings}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              card.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700'
              : card.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
            }`}>
              {card.difficulty}
            </span>
          </div>
        </button>
        <button onClick={onToggleExpand} className="flex-shrink-0 text-gray-400 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && !done && (
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
              {card.steps.map(step => (
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
}
