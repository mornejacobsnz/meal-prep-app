'use client'
import { useState, useEffect, useCallback } from 'react'
import { Recipe, WeeklyPlan, AppSettings, DayOfWeek, MealType, TasteMemory } from '@/lib/types'
import { storage, DEFAULT_SETTINGS } from '@/lib/storage'
import { sync, getLocalHouseholdId, getLocalHouseholdCode, fetchHouseholdCode, leaveHousehold } from '@/lib/household'
import FilterBar from '@/components/FilterBar'
import BudgetSlider from '@/components/BudgetSlider'
import RecipeCard from '@/components/RecipeCard'
import WeeklyPlanner from '@/components/WeeklyPlanner'
import ShoppingList from '@/components/ShoppingList'
import HouseholdSetup from '@/components/HouseholdSetup'
import MoodBar from '@/components/MoodBar'
import SlotPicker from '@/components/SlotPicker'
import PrepGuide from '@/components/PrepGuide'
import { ChefHat, CalendarDays, ShoppingCart, Heart, RefreshCw, X, Users, Copy, Check, ClipboardList, Lock, Loader2 } from 'lucide-react'

type Tab = 'discover' | 'planner' | 'shopping' | 'favourites' | 'prep'

export default function Home() {
  const [tab, setTab] = useState<Tab>('discover')
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [householdCode, setHouseholdCode] = useState<string>('')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [favourites, setFavourites] = useState<Recipe[]>([])
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null)
  const [tasteMemory, setTasteMemory] = useState<TasteMemory>({ liked: [], disliked: [], likedIngredients: [], dislikedIngredients: [], history: [] })
  const [loading, setLoading] = useState(false)
  const [smartFilling, setSmartFilling] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addToSlot, setAddToSlot] = useState<{ day: DayOfWeek; mealType: MealType } | null>(null)
  const [showHouseholdModal, setShowHouseholdModal] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [slotPickerRecipe, setSlotPickerRecipe] = useState<Recipe | null>(null)
  const [removingFavId, setRemovingFavId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [lockingWeek, setLockingWeek] = useState(false)
  const [guideRefreshKey, setGuideRefreshKey] = useState(0)
  const [shoppingVersion, setShoppingVersion] = useState(0)
  const [swappingId, setSwappingId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const hid = getLocalHouseholdId()
    if (hid) {
      setHouseholdId(hid)
      const saved = getLocalHouseholdCode()
      if (saved) {
        setHouseholdCode(saved)
      } else {
        fetchHouseholdCode(hid).then(code => { if (code) setHouseholdCode(code) })
      }
      loadFromSync(hid)
    } else {
      setSettings(storage.getSettings())
      setFavourites(storage.getFavourites())
      setWeeklyPlan(storage.getWeeklyPlan())
      setTasteMemory(storage.getTasteMemory())
    }
  }, [])

  const loadFromSync = async (hid: string) => {
    const defaultPlan = storage.getWeeklyPlan()
    const [s, f, p, tm] = await Promise.all([
      sync.getSettings(hid, DEFAULT_SETTINGS),
      sync.getFavourites(hid),
      sync.getWeeklyPlan(hid, defaultPlan),
      sync.getTasteMemory(hid),
    ])
    setSettings(s)
    setFavourites(f)
    setWeeklyPlan(p)
    setTasteMemory(tm)
  }

  const handleHouseholdReady = (hid: string, code: string) => {
    setHouseholdId(hid)
    setHouseholdCode(code)
    loadFromSync(hid)
  }

  const handleLeaveHousehold = () => {
    leaveHousehold()
    setHouseholdId(null)
    setHouseholdCode('')
    setShowHouseholdModal(false)
  }

  const handleSync = async () => {
    if (!householdId || syncing) return
    setSyncing(true)
    await loadFromSync(householdId)
    setSyncing(false)
  }

  const saveSettings = useCallback((s: AppSettings) => {
    setSettings(s)
    if (householdId) sync.saveSettings(householdId, s)
    else storage.saveSettings(s)
  }, [householdId])

  const generateRecipes = useCallback(async (force = false) => {
    const budgetPerMeal = settings.weeklyBudgetNZD / 14
    const filterKey = JSON.stringify({ filters: settings.filters, budgetPerMeal: budgetPerMeal.toFixed(2), lunchServings: settings.lunchServings, dinnerServings: settings.dinnerServings, mood: settings.mood })

    if (!force) {
      const cached = storage.getRecipeCache(filterKey)
      if (cached) {
        setRecipes(cached)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: settings.filters,
          budgetPerMeal,
          lunchServings: settings.lunchServings,
          dinnerServings: settings.dinnerServings,
          tasteMemory,
          mood: settings.mood,
          count: settings.filters.mealType === 'both' ? 10 : 6,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate recipes')
      const { recipes: newRecipes } = await res.json()
      setRecipes(newRecipes)
      storage.saveRecipeCache(newRecipes, filterKey)
    } catch {
      setError('Could not generate recipes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [settings, tasteMemory])

  const handleSwapRecipe = useCallback(async (recipeId: string) => {
    setSwappingId(recipeId)
    const current = recipes.find(r => r.id === recipeId)
    try {
      const budgetPerMeal = settings.weeklyBudgetNZD / 14
      const mealType = current?.mealType?.[0] ?? settings.filters.mealType
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { ...settings.filters, mealType: mealType === 'both' ? 'lunch' : mealType },
          budgetPerMeal,
          lunchServings: settings.lunchServings,
          dinnerServings: settings.dinnerServings,
          tasteMemory,
          mood: settings.mood,
          count: 1,
          exclude: recipes.map(r => r.name),
        }),
      })
      if (!res.ok) throw new Error()
      const { recipes: [newRecipe] } = await res.json()
      if (newRecipe) setRecipes(prev => prev.map(r => r.id === recipeId ? newRecipe : r))
    } catch {
      // silently fail — card stays as-is
    } finally {
      setSwappingId(null)
    }
  }, [recipes, settings, tasteMemory])

  useEffect(() => {
    if (mounted && tab === 'discover' && recipes.length === 0) {
      const budgetPerMeal = settings.weeklyBudgetNZD / 14
      const filterKey = JSON.stringify({ filters: settings.filters, budgetPerMeal: budgetPerMeal.toFixed(2), lunchServings: settings.lunchServings, dinnerServings: settings.dinnerServings, mood: settings.mood })
      const cached = storage.getRecipeCache(filterKey)
      if (cached) setRecipes(cached)
    }
  }, [mounted, tab])

  const handleFavourite = (recipe: Recipe) => {
    const isFav = favourites.some(r => r.id === recipe.id)
    const updated = isFav ? favourites.filter(r => r.id !== recipe.id) : [...favourites, recipe]
    setFavourites(updated)
    if (householdId) sync.saveFavourites(householdId, updated)
    else {
      if (isFav) storage.removeFavourite(recipe.id)
      else storage.saveFavourite(recipe)
    }
  }

  const handleRate = (recipe: Recipe, rating: 'liked' | 'disliked' | 'neutral') => {
    storage.updateTasteMemory(recipe, rating)
    const tm = storage.getTasteMemory()
    setTasteMemory(tm)
    if (householdId) sync.saveTasteMemory(householdId, tm)
    if (rating === 'disliked') {
      setRecipes(prev => prev.filter(r => r.id !== recipe.id))
    }
  }

  const handlePlanUpdate = (plan: WeeklyPlan) => {
    setWeeklyPlan(plan)
    if (householdId) sync.saveWeeklyPlan(householdId, plan)
    else storage.saveWeeklyPlan(plan)
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

  const handleSlotPickerAssign = (day: DayOfWeek, mealType: MealType) => {
    if (!weeklyPlan || !slotPickerRecipe) return
    const updated: WeeklyPlan = {
      ...weeklyPlan,
      slots: weeklyPlan.slots.map(slot =>
        slot.day === day && slot.mealType === mealType ? { ...slot, recipe: slotPickerRecipe } : slot
      ),
    }
    handlePlanUpdate(updated)
    setSlotPickerRecipe(null)
  }

  const handleActiveDaysChange = (days: DayOfWeek[]) => {
    const updated = { ...settings, activeDays: days }
    saveSettings(updated)
  }

  const handleSmartFill = useCallback(async () => {
    if (!weeklyPlan) return
    setSmartFilling(true)
    try {
      const smartSettings = { ...settings }
      const res = await fetch('/api/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasteMemory, settings: smartSettings, mood: settings.mood, favouriteNames: favourites.map(r => r.name) }),
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

  const handleLockWeek = useCallback(async () => {
    if (!weeklyPlan) return
    setLockingWeek(true)
    const filledSlots = weeklyPlan.slots.filter(s => settings.activeDays.includes(s.day) && s.recipe)
    const uniqueRecipes: Recipe[] = []
    const seen = new Set<string>()
    for (const slot of filledSlots) {
      if (slot.recipe && !seen.has(slot.recipe.id)) {
        seen.add(slot.recipe.id)
        uniqueRecipes.push(slot.recipe)
      }
    }
    try {
      const res = await fetch('/api/prep-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: uniqueRecipes, lunchServings: settings.lunchServings, dinnerServings: settings.dinnerServings }),
      })
      if (!res.ok) throw new Error('Failed')
      const { guide } = await res.json()
      const prev = storage.getPlanGuideState()
      storage.savePlanGuideState({
        guide,
        completedRecipeIds: [],
        lockedAt: new Date().toISOString(),
        carryOverRecipes: prev?.carryOverRecipes ?? [],
      })
      setGuideRefreshKey(k => k + 1)
      ;['mealprep_manual_shopping', 'mealprep_pantry_moved', 'mealprep_shopping_checked'].forEach(k => localStorage.removeItem(k))
      setShoppingVersion(v => v + 1)
      setTab('prep')
    } catch {
      setError('Could not generate guide. Please try again.')
    } finally {
      setLockingWeek(false)
    }
  }, [weeklyPlan, settings])

  if (!mounted) return null
  if (!householdId) return <HouseholdSetup onReady={handleHouseholdReady} />

  const TABS = [
    { key: 'discover' as Tab, label: 'Discover', icon: ChefHat },
    { key: 'planner' as Tab, label: 'Planner', icon: CalendarDays },
    { key: 'shopping' as Tab, label: 'Shopping', icon: ShoppingCart },
    { key: 'favourites' as Tab, label: 'Saved', icon: Heart },
    { key: 'prep' as Tab, label: 'Guide', icon: ClipboardList },
  ]

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meal Planner</h1>
            <p className="text-xs text-gray-400">Budget: ${settings.weeklyBudgetNZD} NZD/week</p>
          </div>
          <div className="flex items-center gap-2">
            {householdId && (
              <button
                onClick={handleSync}
                disabled={syncing}
                title="Sync household data"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              </button>
            )}
            {householdCode && (
              <button
                onClick={() => setShowHouseholdModal(true)}
                className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 hover:bg-emerald-100 transition-colors"
              >
                <Users size={11} className="text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 tracking-wider">{householdCode}</span>
              </button>
            )}
          </div>
        </div>
        {addToSlot && (
          <div className="flex items-center justify-between bg-indigo-500 rounded-xl px-3 py-2 mt-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold text-white">
                Pick a recipe for {addToSlot.day} {addToSlot.mealType}
              </span>
            </div>
            <button
              onClick={() => { setAddToSlot(null); setTab('planner') }}
              className="flex items-center gap-1 text-indigo-200 hover:text-white text-xs font-medium transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === 'discover' && (
          <div className="p-4 space-y-4">
            <BudgetSlider
              value={settings.weeklyBudgetNZD}
              onChange={v => saveSettings({ ...settings, weeklyBudgetNZD: v })}
              lunchServings={settings.lunchServings}
              dinnerServings={settings.dinnerServings}
              onLunchServingsChange={n => saveSettings({ ...settings, lunchServings: n })}
              onDinnerServingsChange={n => saveSettings({ ...settings, dinnerServings: n })}
            />
            <FilterBar
              filters={settings.filters}
              onChange={f => saveSettings({ ...settings, filters: f })}
            />
            <MoodBar
              mood={settings.mood}
              onChange={m => saveSettings({ ...settings, mood: m })}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">
                {loading ? 'Finding recipes...' : `${recipes.length} recipes`}
              </span>
              <button
                onClick={() => generateRecipes(true)}
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
            ) : recipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-center">
                <ChefHat size={44} className="mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">No recipes yet</p>
                <p className="text-xs mt-1 opacity-70">Tap Refresh to generate this week's recipes</p>
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
                            isFavourite={favourites.some(r => r.id === recipe.id)}
                            onFavourite={() => handleFavourite(recipe)}
                            onRate={rating => handleRate(recipe, rating)}
                            onAddToPlanner={addToSlot ? () => handleAddToPlanner(recipe) : undefined}
                            onFillAll={addToSlot ? (mt) => handleFillAll(recipe, mt) : undefined}
                            onSwap={() => handleSwapRecipe(recipe.id)}
                            swapping={swappingId === recipe.id}
                            addToSlot={addToSlot}
                            servings={recipe.mealType.includes('lunch') ? settings.lunchServings : settings.dinnerServings}
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
                    isFavourite={favourites.some(r => r.id === recipe.id)}
                    onFavourite={() => handleFavourite(recipe)}
                    onRate={rating => handleRate(recipe, rating)}
                    onAddToPlanner={addToSlot ? () => handleAddToPlanner(recipe) : undefined}
                    onFillAll={addToSlot ? (mt) => handleFillAll(recipe, mt) : undefined}
                    onSwap={() => handleSwapRecipe(recipe.id)}
                    swapping={swappingId === recipe.id}
                    addToSlot={addToSlot}
                    servings={recipe.mealType.includes('lunch') ? settings.lunchServings : settings.dinnerServings}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'planner' && weeklyPlan && (
          <div className="p-4 space-y-4">
            <WeeklyPlanner
              plan={weeklyPlan}
              onUpdate={handlePlanUpdate}
              onSlotClick={handleSlotClick}
              activeDays={settings.activeDays}
              onActiveDaysChange={handleActiveDaysChange}
              onSmartFill={handleSmartFill}
              smartFilling={smartFilling}
            />
            {weeklyPlan.slots.some(s => settings.activeDays.includes(s.day) && s.recipe) && (
              <button
                onClick={handleLockWeek}
                disabled={lockingWeek}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-sm hover:bg-emerald-600 transition-colors disabled:opacity-60"
              >
                {lockingWeek ? (
                  <><Loader2 size={16} className="animate-spin" />Generating recipe cards...</>
                ) : (
                  <><Lock size={15} />Lock the Week</>
                )}
              </button>
            )}
          </div>
        )}

        {tab === 'shopping' && weeklyPlan && (
          <div className="p-4">
            <ShoppingList key={shoppingVersion} plan={weeklyPlan} activeDays={settings.activeDays} />
          </div>
        )}

        {tab === 'prep' && weeklyPlan && (
          <div className="p-4">
            <PrepGuide key={guideRefreshKey} plan={weeklyPlan} activeDays={settings.activeDays} lunchServings={settings.lunchServings} dinnerServings={settings.dinnerServings} />
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
                  onAddToPlanner={() => setSlotPickerRecipe(recipe)}
                  onFillAll={addToSlot ? (mt) => handleFillAll(recipe, mt) : undefined}
                  addToSlot={addToSlot}
                  servings={recipe.mealType.includes('lunch') ? settings.lunchServings : settings.dinnerServings}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Slot picker modal (from favourites) */}
      {slotPickerRecipe && weeklyPlan && (
        <SlotPicker
          plan={weeklyPlan}
          activeDays={settings.activeDays}
          recipeName={slotPickerRecipe.name}
          onPick={handleSlotPickerAssign}
          onClose={() => setSlotPickerRecipe(null)}
        />
      )}

      {/* Household code modal */}
      {showHouseholdModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowHouseholdModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-500" />
                <h3 className="font-bold text-gray-900">Your Household</h3>
              </div>
              <button onClick={() => setShowHouseholdModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500">Share this code with anyone you want to plan meals with. They open the app and tap "Join household".</p>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold tracking-[0.3em] text-gray-900 mb-3">{householdCode}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Join my Meal Prep household!\nCode: ${householdCode}\nApp: https://meal-prep-app-rouge.vercel.app`)
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 2000)
                }}
                className="flex items-center gap-1.5 mx-auto text-sm text-emerald-600 font-medium"
              >
                {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                {codeCopied ? 'Copied!' : 'Copy code + link'}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">App URL: meal-prep-app-rouge.vercel.app</p>
            <button
              onClick={handleLeaveHousehold}
              className="w-full text-center text-xs text-red-400 hover:text-red-600 transition-colors py-1"
            >
              Leave household
            </button>
          </div>
        </div>
      )}

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
