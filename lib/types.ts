export type MealType = 'lunch' | 'dinner'
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface Recipe {
  id: string
  name: string
  description: string
  mealType: MealType[]
  prepTime: number
  cookTime: number
  totalTime: number
  servings: number
  estimatedCostNZD: number
  ingredients: Ingredient[]
  steps: string[]
  tags: RecipeTag[]
  nutrition?: {
    calories: number
    protein: string
    carbs: string
    fat: string
  }
  createdAt: string
}

export interface Ingredient {
  name: string
  quantity: number
  unit: string
  estimatedCostNZD: number
}

export type RecipeTag = 'simple' | 'quick' | 'under-30-min' | 'kid-friendly'

export interface MealSlot {
  day: DayOfWeek
  mealType: MealType
  recipe: Recipe | null
}

export interface WeeklyPlan {
  id: string
  weekStart: string
  slots: MealSlot[]
}

export interface TasteMemory {
  liked: string[]
  disliked: string[]
  likedIngredients: string[]
  dislikedIngredients: string[]
  history: {
    recipeId: string
    recipeName: string
    date: string
    rating: 'liked' | 'disliked' | 'neutral'
  }[]
}

export interface Filters {
  simple: boolean
  quick: boolean
  under30min: boolean
  kidFriendly: boolean
  mealType: MealType | 'both'
}

export interface AppSettings {
  weeklyBudgetNZD: number
  defaultServings: number
  filters: Filters
}
