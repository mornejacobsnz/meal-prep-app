'use client'

interface Props {
  value: number
  onChange: (value: number) => void
  lunchServings: number
  dinnerServings: number
  onLunchServingsChange: (n: number) => void
  onDinnerServingsChange: (n: number) => void
}

export default function BudgetSlider({ value, onChange, lunchServings, dinnerServings, onLunchServingsChange, onDinnerServingsChange }: Props) {
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

      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700">Servings</label>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-14">🥗 Lunch</span>
          <div className="flex gap-1.5 flex-1">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => onLunchServingsChange(n)}
                className={`flex-1 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  lunchServings === n
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-14">🍽️ Dinner</span>
          <div className="flex gap-1.5 flex-1">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => onDinnerServingsChange(n)}
                className={`flex-1 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  dinnerServings === n
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
