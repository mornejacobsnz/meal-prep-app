'use client'
import { Filters, MealType, DietType } from '@/lib/types'
import { Clock, Smile, Leaf, Package } from 'lucide-react'

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

const TAGS = [
  { key: 'simple' as const, label: 'Simple', icon: Leaf },
  { key: 'under30min' as const, label: '< 30 min', icon: Clock },
  { key: 'kidFriendly' as const, label: 'Kids', icon: Smile },
  { key: 'mealPrepFriendly' as const, label: 'Meal Prep', icon: Package },
]

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'meat', label: 'Meat' },
  { value: 'vegetarian', label: 'Vegetarian' },
]

export default function FilterBar({ filters, onChange }: Props) {
  const toggle = (key: keyof Omit<Filters, 'mealType' | 'dietType'>) => {
    onChange({ ...filters, [key]: !filters[key] })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {TAGS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filters[key]
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {(['both', 'lunch', 'dinner'] as const).map(mt => (
          <button
            key={mt}
            onClick={() => onChange({ ...filters, mealType: mt as MealType | 'both' })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filters.mealType === mt
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            {mt === 'both' ? 'Lunch & Dinner' : mt.charAt(0).toUpperCase() + mt.slice(1)}
          </button>
        ))}
        <div className="flex-shrink-0 w-px bg-gray-200 mx-1" />
        {DIET_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ ...filters, dietType: value })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filters.dietType === value
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
