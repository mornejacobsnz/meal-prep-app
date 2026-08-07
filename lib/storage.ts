import { Recipe, WeeklyPlan, TasteMemory, AppSettings, DayOfWeek, MealType } from './types'

const KEYS = {
  favourites: 'mealprep_favourites',
  weeklyPlan: 'mealprep_weekly_plan',
  tasteMemory: 'mealprep_taste_memory',
  settings: 'mealprep_settings',
  recipeCache: 'mealprep_recipe_cache',
  planGuide: 'mealprep_plan_guide',
  lastRecipes: 'mealprep_last_recipes',
}

export interface CarryOverRecipe {
  id: string
  name: string
  slots: string[]
}

export interface StoredPlanGuide {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guide: any
  completedRecipeIds: string[]
  lockedAt: string
  carryOverRecipes: CarryOverRecipe[]
}

const RECIPE_CACHE_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

interface RecipeCache {
  recipes: Recipe[]
  filterKey: string
  timestamp: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  weeklyBudgetNZD: 150,
  lunchServings: 2,
  dinnerServings: 4,
  filters: {
    simple: false,
    under30min: false,
    kidFriendly: false,
    mealPrepFriendly: false,
    mealType: 'both',
    dietType: 'any',
  },
  activeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  mood: '',
}

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
  getFavourites: (): Recipe[] => get(KEYS.favourites, []),
  saveFavourite: (recipe: Recipe) => {
    const favs = storage.getFavourites()
    if (!favs.find(r => r.id === recipe.id)) {
      set(KEYS.favourites, [...favs, recipe])
    }
  },
  removeFavourite: (recipeId: string) => {
    set(KEYS.favourites, storage.getFavourites().filter(r => r.id !== recipeId))
  },
  isFavourite: (recipeId: string): boolean =>
    storage.getFavourites().some(r => r.id === recipeId),

  getWeeklyPlan: (): WeeklyPlan => {
    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const mealTypes: MealType[] = ['lunch', 'dinner']
    const defaultPlan: WeeklyPlan = {
      id: 'current',
      weekStart: new Date().toISOString(),
      slots: days.flatMap(day => mealTypes.map(mealType => ({ day, mealType, recipe: null }))),
    }
    return get(KEYS.weeklyPlan, defaultPlan)
  },
  saveWeeklyPlan: (plan: WeeklyPlan) => set(KEYS.weeklyPlan, plan),

  getTasteMemory: (): TasteMemory =>
    get(KEYS.tasteMemory, { liked: [], disliked: [], likedIngredients: [], dislikedIngredients: [], history: [] }),
  updateTasteMemory: (recipe: Recipe, rating: 'liked' | 'disliked' | 'neutral') => {
    const memory = storage.getTasteMemory()
    const ingredientNames = recipe.ingredients.map(i => i.name.toLowerCase())

    if (rating === 'liked') {
      if (!memory.liked.includes(recipe.name)) memory.liked.push(recipe.name)
      memory.disliked = memory.disliked.filter(n => n !== recipe.name)
      ingredientNames.forEach(ing => {
        if (!memory.likedIngredients.includes(ing)) memory.likedIngredients.push(ing)
      })
    } else if (rating === 'disliked') {
      if (!memory.disliked.includes(recipe.name)) memory.disliked.push(recipe.name)
      memory.liked = memory.liked.filter(n => n !== recipe.name)
      ingredientNames.forEach(ing => {
        if (!memory.dislikedIngredients.includes(ing)) memory.dislikedIngredients.push(ing)
      })
    }

    memory.history.unshift({
      recipeId: recipe.id,
      recipeName: recipe.name,
      date: new Date().toISOString(),
      rating,
    })
    memory.history = memory.history.slice(0, 100)
    set(KEYS.tasteMemory, memory)
  },

  getSettings: (): AppSettings => get(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (settings: AppSettings) => set(KEYS.settings, settings),

  getPlanGuideState: (): StoredPlanGuide | null => get<StoredPlanGuide | null>(KEYS.planGuide, null),
  savePlanGuideState: (state: StoredPlanGuide) => set(KEYS.planGuide, state),
  clearPlanGuideState: () => { if (typeof window !== 'undefined') localStorage.removeItem(KEYS.planGuide) },

  getRecipeCache: (filterKey: string): Recipe[] | null => {
    const cached = get<RecipeCache | null>(KEYS.recipeCache, null)
    if (!cached) return null
    if (cached.filterKey !== filterKey) return null
    if (Date.now() - cached.timestamp > RECIPE_CACHE_TTL_MS) return null
    return cached.recipes
  },
  saveRecipeCache: (recipes: Recipe[], filterKey: string) => {
    set<RecipeCache>(KEYS.recipeCache, { recipes, filterKey, timestamp: Date.now() })
  },
  clearRecipeCache: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(KEYS.recipeCache)
  },

  // No-TTL backup — always shows last-known recipes even if Supabase is slow or fails
  getLastRecipes: (): Recipe[] => get<Recipe[]>(KEYS.lastRecipes, []),
  saveLastRecipes: (recipes: Recipe[]) => set(KEYS.lastRecipes, recipes),
}
