'use client'
import { WeeklyPlan, DayOfWeek, MealType } from '@/lib/types'
import { X, UtensilsCrossed, Sparkles, RefreshCw } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
  onUpdate: (plan: WeeklyPlan) => void
  onSlotClick: (day: DayOfWeek, mealType: MealType) => void
  activeDays: DayOfWeek[]
  onActiveDaysChange: (days: DayOfWeek[]) => void
  onSmartFill: () => void
  smartFilling: boolean
}

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
}

export default function WeeklyPlanner({ plan, onUpdate, onSlotClick, activeDays, onActiveDaysChange, onSmartFill, smartFilling }: Props) {
  const removeRecipe = (day: DayOfWeek, mealType: MealType) => {
    const updated: WeeklyPlan = {
      ...plan,
      slots: plan.slots.map(slot =>
        slot.day === day && slot.mealType === mealType ? { ...slot, recipe: null } : slot
      ),
    }
    onUpdate(updated)
  }

  const toggleDay = (day: DayOfWeek) => {
    if (activeDays.includes(day)) {
      if (activeDays.length === 1) return
      onActiveDaysChange(activeDays.filter(d => d !== day))
    } else {
      onActiveDaysChange([...ALL_DAYS.filter(d => activeDays.includes(d) || d === day)])
    }
  }

  const getSlot = (day: DayOfWeek, mealType: MealType) =>
    plan.slots.find(s => s.day === day && s.mealType === mealType)

  const visibleSlots = plan.slots.filter(s => activeDays.includes(s.day))
  const totalCost = visibleSlots.reduce((sum, slot) => sum + (slot.recipe?.estimatedCostNZD ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-900">This Week</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-emerald-600">${totalCost.toFixed(0)} NZD</span>
          <button
            onClick={onSmartFill}
            disabled={smartFilling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500 text-white text-sm font-semibold shadow-sm hover:bg-violet-600 transition-colors disabled:opacity-60"
          >
            <Sparkles size={14} className={smartFilling ? 'animate-pulse' : ''} />
            {smartFilling ? 'Planning...' : 'Surprise Me'}
          </button>
        </div>
      </div>

      {/* Day picker */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {ALL_DAYS.map(day => (
          <button
            key={day}
            onClick={() => toggleDay(day)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeDays.includes(day)
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {DAY_SHORT[day]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {ALL_DAYS.filter(day => activeDays.includes(day)).map(day => (
          <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-700">{day}</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              {(['lunch', 'dinner'] as MealType[]).map(mealType => {
                const slot = getSlot(day, mealType)
                const recipe = slot?.recipe
                return (
                  <div key={mealType} className="p-3">
                    <div className="text-xs font-medium text-gray-400 uppercase mb-1.5">{mealType}</div>
                    {recipe ? (
                      <div className="relative group">
                        <div className="text-sm font-medium text-gray-800 leading-tight pr-10">{recipe.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">${recipe.estimatedCostNZD.toFixed(0)} · {recipe.totalTime}min</div>
                        <div className="absolute top-0 right-0 flex gap-0.5">
                          <button
                            onClick={() => onSlotClick(day, mealType)}
                            className="p-0.5 text-gray-300 hover:text-indigo-400 transition-colors"
                            title="Replace meal"
                          >
                            <RefreshCw size={12} />
                          </button>
                          <button
                            onClick={() => removeRecipe(day, mealType)}
                            className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                            title="Remove meal"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSlotClick(day, mealType)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-xs hover:border-emerald-300 hover:text-emerald-500 transition-colors"
                      >
                        <UtensilsCrossed size={12} />
                        Add meal
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
