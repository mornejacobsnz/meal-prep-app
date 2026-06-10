'use client'
import { Recipe, MealType } from '@/lib/types'
import { Clock, DollarSign, Heart, ThumbsDown, ThumbsUp, Users, ChevronDown, ChevronUp, Plus, CopyPlus } from 'lucide-react'
import { useState } from 'react'

interface Props {
  recipe: Recipe
  isFavourite: boolean
  onFavourite: () => void
  onRate: (rating: 'liked' | 'disliked' | 'neutral') => void
  onAddToPlanner?: () => void
  onFillAll?: (mealType: MealType) => void
  addToSlot?: { day: string; mealType: MealType } | null
  servings?: number
}

const TAG_STYLES: Record<string, string> = {
  'simple': 'bg-green-100 text-green-700',
  'quick': 'bg-yellow-100 text-yellow-700',
  'under-30-min': 'bg-blue-100 text-blue-700',
  'kid-friendly': 'bg-pink-100 text-pink-700',
  'meal-prep-friendly': 'bg-purple-100 text-purple-700',
}

export default function RecipeCard({ recipe, isFavourite, onFavourite, onRate, onAddToPlanner, onFillAll, addToSlot, servings }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [ratingFeedback, setRatingFeedback] = useState<'liked' | 'disliked' | null>(null)
  const [dismissing, setDismissing] = useState(false)
  const scale = servings ? servings / recipe.servings : 1
  const scaledCost = (recipe.estimatedCostNZD * scale).toFixed(2)

  const handleRate = (rating: 'liked' | 'disliked') => {
    setRatingFeedback(rating)
    if (rating === 'disliked') {
      setDismissing(true)
      setTimeout(() => onRate('disliked'), 400)
    } else {
      onRate('liked')
      setTimeout(() => setRatingFeedback(null), 1200)
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-400 ${dismissing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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
              Add here
            </button>
          )}
          {onFillAll && addToSlot && (
            <button
              onClick={() => onFillAll(addToSlot.mealType)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
              title={`Add to all ${addToSlot.mealType}s this week`}
            >
              <CopyPlus size={14} />
              All {addToSlot.mealType}s
            </button>
          )}
          <button
            onClick={() => handleRate('liked')}
            className={`p-2 rounded-xl transition-all ${ratingFeedback === 'liked' ? 'bg-green-500 text-white scale-110' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            title="Like this recipe"
          >
            <ThumbsUp size={14} fill={ratingFeedback === 'liked' ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => handleRate('disliked')}
            className={`p-2 rounded-xl transition-all ${ratingFeedback === 'disliked' ? 'bg-red-500 text-white scale-110' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
            title="Dislike — remove this recipe"
          >
            <ThumbsDown size={14} fill={ratingFeedback === 'disliked' ? 'currentColor' : 'none'} />
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
