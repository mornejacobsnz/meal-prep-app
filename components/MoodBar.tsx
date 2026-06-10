'use client'
import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'

interface Props {
  mood: string
  onChange: (mood: string) => void
}

const MOODS = [
  { label: '🍲 Comfort Food', value: 'hearty comfort food, warming and filling meals' },
  { label: '🥗 Light & Fresh', value: 'light fresh meals, salads and lean proteins, nothing heavy' },
  { label: '💪 High Protein', value: 'high protein meals focused on muscle building and satiety' },
  { label: '🥑 Keto', value: 'keto diet, low carb high fat, no grains rice or sugar' },
  { label: '☕ Winter Warmers', value: 'hearty winter meals, soups stews and warm dishes' },
  { label: '💰 Budget Stretch', value: 'very budget-friendly meals, cheap ingredients, maximum value' },
]

export default function MoodBar({ mood, onChange }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const activeMood = MOODS.find(m => m.value === mood)

  const handleChip = (value: string) => {
    onChange(mood === value ? '' : value)
    setShowInput(false)
  }

  const handleCustomSubmit = () => {
    if (inputVal.trim()) {
      onChange(inputVal.trim())
      setInputVal('')
      setShowInput(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={13} className="text-violet-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">This week&apos;s vibe</span>
        {mood && !activeMood && (
          <span className="flex-1 text-xs text-violet-600 font-medium truncate">"{mood}"</span>
        )}
        {mood && (
          <button onClick={() => onChange('')} className="ml-auto text-gray-300 hover:text-gray-500">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {MOODS.map(m => (
          <button
            key={m.value}
            onClick={() => handleChip(m.value)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              mood === m.value
                ? 'bg-violet-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-600'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={() => setShowInput(v => !v)}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
            showInput ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500 hover:bg-violet-50'
          }`}
        >
          ✏️ Custom
        </button>
      </div>

      {showInput && (
        <div className="flex gap-2">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
            placeholder="e.g. no rice this week, something my kids will eat..."
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400"
            autoFocus
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!inputVal.trim()}
            className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm font-medium disabled:opacity-40"
          >
            Set
          </button>
        </div>
      )}
    </div>
  )
}
