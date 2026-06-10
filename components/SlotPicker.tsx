'use client'
import { WeeklyPlan, DayOfWeek, MealType } from '@/lib/types'
import { X } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
  activeDays: DayOfWeek[]
  onPick: (day: DayOfWeek, mealType: MealType) => void
  onClose: () => void
  recipeName: string
}

const MEAL_TYPES: MealType[] = ['lunch', 'dinner']

export default function SlotPicker({ plan, activeDays, onPick, onClose, recipeName }: Props) {
  const getSlot = (day: DayOfWeek, mt: MealType) =>
    plan.slots.find(s => s.day === day && s.mealType === mt)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Add to plan</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{recipeName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {activeDays.map(day => (
            <div key={day} className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map(mt => {
                const slot = getSlot(day, mt)
                const occupied = !!slot?.recipe
                return (
                  <button
                    key={mt}
                    onClick={() => onPick(day, mt)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      occupied
                        ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{day.slice(0, 3)} {mt}</span>
                    {occupied && <span className="text-xs opacity-60 truncate ml-1 max-w-[80px]">{slot?.recipe?.name.split(' ').slice(0,2).join(' ')}</span>}
                    {!occupied && <span className="text-xs opacity-50">empty</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
