'use client'

interface Props {
  value: number
  onChange: (value: number) => void
  servings: number
  onServingsChange: (servings: number) => void
}

export default function BudgetSlider({ value, onChange, servings, onServingsChange }: Props) {
  const perMeal = value / 14

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">Weekly Budget</label>
          <span className="text-lg font-bold text-emerald-600">${value} NZD</span>
        </div>
        <input
          type="range"
          min={50}
          max={400}
          step={10}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$50</span>
          <span className="text-gray-500">≈ ${perMeal.toFixed(0)}/meal</span>
          <span>$400</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">Servings</label>
          <span className="text-lg font-bold text-indigo-600">{servings} people</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => onServingsChange(n)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                servings === n
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
