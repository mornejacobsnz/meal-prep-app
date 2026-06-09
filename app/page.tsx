'use client'
import { useState, useEffect, useCallback } from 'react'
import { Recipe, WeeklyPlan, AppSettings, DayOfWeek, MealType, TasteMemory } from '@/lib/types'
import { storage, DEFAULT_SETTINGS } from '@/lib/storage'
import FilterBar from '@/components/FilterBar'
import BudgetSlider from '@/components/BudgetSlider'
import RecipeCard from '@/components/RecipeCard'
import WeeklyPlanner from '@/components/WeeklyPlanner'
import ShoppingList from '@/components/ShoppingList'
import { ChefHat, CalendarDays, ShoppingCart, Heart, RefreshCw, X } from 'lucide-react'

type Tab = 'discover' | 'planner' | 'shopping' | 'favourites'

export default function Home() {
  const [tab, setTab] = useState<Tab>('discover')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [favourites, setFavourites] = useState<Recipe[]>([])
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null)
  const [tasteMemory, setTasteMemory] = useState<TasteMemory>({ liked: [], disliked: [], likedIngredients: [], dislikedIngredients: [], history: [] })
  const [loading, setLoading] = useState(false)
  const [smartFilling, setSmartFilling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addToSlot, setAddToSlot] = useState<{ day: DayOfWeek; mealType: MealType } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSettings(storage.getSettings())
    setFavourites(storage.getFavourites())
    setWeeklyPlan(storage.getWeeklyPlan())
    setTasteMemory(storage.getTasteMemory())
  }, [])

  const saveSettings = useCallback((s: AppSettings) => {
    setSettings(s)
    storage.saveSettings(s)
  }, [])

  const generateRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const budgetPerMeal = settings.weeklyBudgetNZD / 14
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: settings.filters,
          budgetPerMeal,
          servings: settings.defaultServings,
          tasteMemory,
          count: settings.filters.mealType === 'both' ? 10 : 6,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate recipes')
      const { recipes: newRecipes } = await res.json()
      setRecipes(newRecipes)
    } catch {
      setError('Could not generate recipes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [settings, tasteMemory])

  useEffect(() => {
    if (mounted && tab === 'discover' && recipes.length === 0) {
      generateRecipes()
    }
  }, [mounted, tab])

  const handleFavourite = (recipe: Recipe) => {
    if (storage.isFavourite(recipe.id)) {
      storage.removeFavourite(recipe.id)
    } else {
      storage.saveFavourite(recipe)
    }
    setFavourites(storage.getFavourites())
  }

  const handleRate = (recipe: Recipe, rating: 'liked' | 'disliked' | 'neutral') => {
    storage.updateTasteMemory(recipe, rating)
    setTasteMemory(storage.getTasteMemory())
    if (rating === 'disliked') {
      setRecipes(prev => prev.filter(r => r.id !== recipe.id))
    }
  }

  const handlePlanUpdate = (plan: WeeklyPlan) => {
    setWeeklyPlan(plan)
    storage.saveWeeklyPlan(plan)
  }

  const handleSlotClick = (day: DayOfWeek, mealType: MealType) => {
    setAddToSlot({ day, mealType })
    setTab('discover')
  }

  const handleAddToPlanner = (recipe: Recipe) => {
    if (!weeklyPlan || !addToSlot) return
    const updated: WeeklyPlan = {
      ...weeklyPlan,
      slots: weeklyPlan.slots.map(slot =>
        slot.day === addToSlot.day && slot.mealType === addToSlot.mealType
          ? { ...slot, recipe }
          : slot
      ),
    }
    handlePlanUpdate(updated)
    setAddToSlot(null)
    setTab('planner')
  }

  const handleFillAll = (recipe: Recipe, mealType: MealType) => {
    if (!weeklyPlan) return
    const updated: WeeklyPlan = {
      ...weeklyPlan,
      slots: weeklyPlan.slots.map(slot =>
        slot.mealType === mealType && settings.activeDays.includes(slot.day)
          ? { ...slot, recipe }
          : slot
      ),
    }
    handlePlanUpdate(updated)
    setAddToSlot(null)
    setTab('planner')
  }

  const handleActiveDaysChange = (days: DayOfWeek[]) => {
    const updated = { ...settings, activeDays: days }
    saveSettings(updated)
  }

  const handleSmartFill = useCallback(async () => {
    if (!weeklyPlan) return
    setSmartFilling(true)
    try {
      const res = await fetch('/api/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasteMemory, settings }),
      })
      if (!res.ok) throw new Error('Smart fill failed')
      const { assignedRecipes } = await res.json()
      const updated: WeeklyPlan = {
        ...weeklyPlan,
        slots: weeklyPlan.slots.map(slot => {
          const match = assignedRecipes.find(
            (r: { assignedDay: string; assignedMealType: string }) =>
              r.assignedDay === slot.day && r.assignedMealType === slot.mealType
          )
          return match ? { ...slot, recipe: match } : slot
        }),
      }
      handlePlanUpdate(updated)
      setTab('planner')
    } catch {
      setError('Smart fill failed. Please try again.')
    } finally {
      setSmartFilling(false)
    }
  }, [weeklyPlan, tasteMemory, settings])

  if (!mounted) return null

  const TABS = [
    { key: 'discover' as Tab, label: 'Discover', icon: ChefHat },
    { key: 'planner' as Tab, label: 'Planner', icon: CalendarDays },
    { key: 'shopping' as Tab, label: 'Shopping', icon: ShoppingCart },
    { key: 'favourites' as Tab, label: 'Favourites', icon: Heart },
  ]

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meal Prep</h1>
            <p className="text-xs text-gray-400">Budget: ${settings.weeklyBudgetNZD} NZD/week</p>
          </div>
          {addToSlot && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
              <span className="text-xs font-medium text-emerald-700">
                Adding to {addToSlot.day} {addToSlot.mealType}
              </span>
              <button onClick={() => setAddToSlot(null)}>
                <X size={12} className="text-emerald-500" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === 'discover' && (
          <div className="p-4 space-y-4">
            <BudgetSlider
              value={settings.weeklyBudgetNZD}
              onChange={v => saveSettings({ ...settings, weeklyBudgetNZD: v })}
              servings={settings.defaultServings}
              onServingsChange={n => saveSettings({ ...settings, defaultServings: n })}
            />
            <FilterBar
              filters={settings.filters}
              onChange={f => saveSettings({ ...settings, filters: f })}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">
                {loading ? 'Finding recipes...' : `${recipes.length} recipes`}
              </span>
              <button
                onClick={generateRecipes}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-emerald-600 transition-colors"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : settings.filters.mealType === 'both' ? (
              <div className="space-y-6">
                {([
                  { label: '🥗 Lunches', type: 'lunch' as const },
                  { label: '🍽️ Dinners', type: 'dinner' as const },
                ] as const).map(({ label, type }) => {
                  const group = recipes.filter(r => r.mealType.includes(type))
                  if (group.length === 0) return null
                  return (
                    <div key={type}>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{label}</h3>
                      <div className="space-y-3">
                        {group.map(recipe => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            isFavourite={storage.isFavourite(recipe.id)}
                            onFavourite={() => handleFavourite(recipe)}
                            onRate={rating => handleRate(recipe, rating)}
                            onAddToPlanner={addToSlot ? () => handleAddToPlanner(recipe) : undefined}
                            onFillAll={addToSlot ? (mt) => handleFillAll(recipe, mt) : undefined}
                            addToSlot={addToSlot}
                            servings={settings.defaultServings}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {recipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavourite={storage.isFavourite(recipe.id)}
                    onFavourite={() => handleFavourite(recipe)}
                    onRate={rating => handleRate(recipe, rating)}
                    onAddToPlanner={addToSlot ? () => handleAddToPlanner(recipe) : undefined}
                    onFillAll={addToSlot ? (mt) => handleFillAll(recipe, mt) : undefined}
                    addToSlot={addToSlot}
                    servings={settings.defaultServings}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'planner' && weeklyPlan && (
          <div className="p-4">
            <WeeklyPlanner
              plan={weeklyPlan}
              onUpdate={handlePlanUpdate}
              onSlotClick={handleSlotClick}
              activeDays={settings.activeDays}
              onActiveDaysChange={handleActiveDaysChange}
              onSmartFill={handleSmartFill}
              smartFilling={smartFilling}
            />
          </div>
        )}

        {tab === 'shopping' && weeklyPlan && (
          <div className="p-4">
            <ShoppingList plan={weeklyPlan} />
          </div>
        )}

        {tab === 'favourites' && (
          <div className="p-4 space-y-3">
            <h2 className="font-bold text-gray-900">Favourites</h2>
            {favourites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Heart size={40} className="mb-3 opacity-40" />
                <p className="text-sm">No favourites yet — tap the heart on any recipe</p>
              </div>
            ) : (
              favourites.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isFavourite={true}
                  onFavourite={() => handleFavourite(recipe)}
                  onRate={rating => handleRate(recipe, rating)}
                  onAddToPlanner={addToSlot ? () => handleAddToPlanner(recipe) : undefined}
                  onFillAll={addToSlot ? (mt) => handleFillAll(recipe, mt) : undefined}
                  addToSlot={addToSlot}
                  servings={settings.defaultServings}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg max-w-lg mx-auto">
        <div className="flex">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
                tab === key ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={20} strokeWidth={tab === key ? 2.5 : 1.5} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
