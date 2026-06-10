import { supabase } from './supabase'
import { Recipe, WeeklyPlan, TasteMemory, AppSettings } from './types'

const LOCAL_KEY = 'mealprep_household_id'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function getLocalHouseholdId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LOCAL_KEY)
}

function setLocalHouseholdId(id: string) {
  localStorage.setItem(LOCAL_KEY, id)
}

export async function createHousehold(): Promise<{ householdId: string; code: string } | null> {
  if (!supabase) return null
  let code = generateCode()
  let attempts = 0
  while (attempts < 5) {
    const { data, error } = await supabase
      .from('households')
      .insert({ code })
      .select('id, code')
      .single()
    if (!error && data) {
      setLocalHouseholdId(data.id)
      return { householdId: data.id, code: data.code }
    }
    code = generateCode()
    attempts++
  }
  return null
}

export async function joinHousehold(code: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('households')
    .select('id')
    .eq('code', code.toUpperCase().trim())
    .single()
  if (error || !data) return null
  setLocalHouseholdId(data.id)
  return data.id
}

async function syncGet<T>(householdId: string, key: string, fallback: T): Promise<T> {
  if (!supabase) return fallback
  const { data } = await supabase
    .from('household_data')
    .select('value')
    .eq('household_id', householdId)
    .eq('key', key)
    .single()
  return data ? (data.value as T) : fallback
}

async function syncSet<T>(householdId: string, key: string, value: T): Promise<void> {
  if (!supabase) return
  await supabase
    .from('household_data')
    .upsert({ household_id: householdId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'household_id,key' })
}

export const sync = {
  getFavourites: (hid: string) => syncGet<Recipe[]>(hid, 'favourites', []),
  saveFavourites: (hid: string, favs: Recipe[]) => syncSet(hid, 'favourites', favs),

  getWeeklyPlan: (hid: string, fallback: WeeklyPlan) => syncGet<WeeklyPlan>(hid, 'weeklyPlan', fallback),
  saveWeeklyPlan: (hid: string, plan: WeeklyPlan) => syncSet(hid, 'weeklyPlan', plan),

  getTasteMemory: (hid: string) =>
    syncGet<TasteMemory>(hid, 'tasteMemory', { liked: [], disliked: [], likedIngredients: [], dislikedIngredients: [], history: [] }),
  saveTasteMemory: (hid: string, memory: TasteMemory) => syncSet(hid, 'tasteMemory', memory),

  getSettings: (hid: string, fallback: AppSettings) => syncGet<AppSettings>(hid, 'settings', fallback),
  saveSettings: (hid: string, settings: AppSettings) => syncSet(hid, 'settings', settings),
}
