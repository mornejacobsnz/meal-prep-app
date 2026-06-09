'use client'
import { Filters, MealType } from '@/lib/types'
import { Zap, Clock, Smile, Leaf } from 'lucide-react'

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

const TAGS = [
  { key: 'simple' as const, label: 'Simple', icon: Leaf },
  { key: 'quick' as const, label: 'Quick', icon: Zap },
  { key: 'under30min' as const, label: '< 30 min', icon: Clock },
  { key: 'kidFriendly' as const, label: 'Kid Friendly', icon: Smile },
]

export default function FilterBar({ filters, onChange }: Props) {
  const toggle = (key: keyof Omit<Filters, 'mealType'>) => {
    onChange({ ...filters, [key]: !filters[key] })
  }

  const setMealType = (mt: MealType | 'both') => {
    onChange({ ...filters, mealType: mt })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {TAGS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
      <div className="flex gap-2">
        {(['both', 'lunch', 'dinner'] as const).map(mt => (
          <button
            key={mt}
            onClick={() => setMealType(mt)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
              filters.mealType === mt
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            {mt === 'both' ? 'Lunch & Dinner' : mt}
          </button>
        ))}
      </div>
    </div>
  )
}
