'use client'
import { Recipe } from '@/lib/types'
import { Clock, DollarSign, Heart, ThumbsDown, ThumbsUp, Users, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useState } from 'react'

interface Props {
  recipe: Recipe
  isFavourite: boolean
  onFavourite: () => void
  onRate: (rating: 'liked' | 'disliked' | 'neutral') => void
  onAddToPlanner?: () => void
  servings?: number
}

const TAG_STYLES: Record<string, string> = {
  'simple': 'bg-green-100 text-green-700',
  'quick': 'bg-yellow-100 text-yellow-700',
  'under-30-min': 'bg-blue-100 text-blue-700',
  'kid-friendly': 'bg-pink-100 text-pink-700',
}

export default function RecipeCard({ recipe, isFavourite, onFavourite, onRate, onAddToPlanner, servings }: Props) {
  const [expanded, setExpanded] = useState(false)
  const scale = servings ? servings / recipe.servings : 1
  const scaledCost = (recipe.estimatedCostNZD * scale).toFixed(2)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{recipe.name}</h3>
          <button
            onClick={onFavourite}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${isFavourite ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
          >
            <Heart size={18} fill={isFavourite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-3 leading-relaxed">{recipe.description}</p>

        <div className="flex gap-3 text-sm text-gray-600 mb-3">
          <span className="flex items-center gap-1">
            <Clock size={14} className="text-gray-400" />
            {recipe.totalTime} min
          </span>
          <span className="flex items-center gap-1">
            <DollarSign size={14} className="text-gray-400" />
            ${scaledCost} NZD
          </span>
          <span className="flex items-center gap-1">
            <Users size={14} className="text-gray-400" />
            {servings ?? recipe.servings}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {recipe.tags.map(tag => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_STYLES[tag] ?? 'bg-gray-100 text-gray-600'}`}>
              {tag.replace('-', ' ')}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Less' : 'View Recipe'}
          </button>
          {onAddToPlanner && (
            <button
              onClick={onAddToPlanner}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
            >
              <Plus size={14} />
              Plan
            </button>
          )}
          <button onClick={() => onRate('liked')} className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
            <ThumbsUp size={14} />
          </button>
          <button onClick={() => onRate('disliked')} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
            <ThumbsDown size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">Ingredients</h4>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => {
                const scaledQty = (ing.quantity * scale).toFixed(ing.quantity * scale < 10 ? 1 : 0)
                return (
                  <li key={i} className="flex justify-between text-sm text-gray-600">
                    <span>{scaledQty} {ing.unit} {ing.name}</span>
                    <span className="text-gray-400">${(ing.estimatedCostNZD * scale).toFixed(2)}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">Method</h4>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {recipe.nutrition && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Cal', value: recipe.nutrition.calories },
                { label: 'Protein', value: recipe.nutrition.protein },
                { label: 'Carbs', value: recipe.nutrition.carbs },
                { label: 'Fat', value: recipe.nutrition.fat },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-2 text-center">
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-sm font-bold text-gray-700">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
