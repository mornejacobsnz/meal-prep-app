'use client'
import { WeeklyPlan, Ingredient } from '@/lib/types'
import { ShoppingCart, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  plan: WeeklyPlan
}

interface AggregatedIngredient extends Ingredient {
  checked: boolean
}

function aggregateIngredients(plan: WeeklyPlan): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>()

  plan.slots.forEach(slot => {
    if (!slot.recipe) return
    slot.recipe.ingredients.forEach(ing => {
      const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`
      if (map.has(key)) {
        const existing = map.get(key)!
        existing.quantity += ing.quantity
        existing.estimatedCostNZD += ing.estimatedCostNZD
      } else {
        map.set(key, { ...ing, checked: false })
      }
    })
  })

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export default function ShoppingList({ plan }: Props) {
  const base = aggregateIngredients(plan)
  const [items, setItems] = useState<AggregatedIngredient[]>(base.map(i => ({ ...i, checked: false })))
  const totalCost = items.reduce((sum, i) => sum + i.estimatedCostNZD, 0)
  const checkedCount = items.filter(i => i.checked).length

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <ShoppingCart size={40} className="mb-3 opacity-40" />
        <p className="text-sm">Add meals to your planner to generate a shopping list</p>
      </div>
    )
  }

  const toggle = (index: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-900">Shopping List</h2>
        <div className="text-right">
          <div className="text-sm font-bold text-emerald-600">${totalCost.toFixed(2)} NZD</div>
          <div className="text-xs text-gray-400">{checkedCount}/{items.length} done</div>
        </div>
      </div>

      {checkedCount > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(checkedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              item.checked ? 'bg-gray-50 opacity-50' : 'bg-white border border-gray-100 shadow-sm'
            }`}
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
            }`}>
              {item.checked && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {item.name}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm text-gray-600">
                {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}
              </div>
              <div className="text-xs text-gray-400">${item.estimatedCostNZD.toFixed(2)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
