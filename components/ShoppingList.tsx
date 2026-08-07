'use client'
import { WeeklyPlan, Ingredient, DayOfWeek } from '@/lib/types'
import { ShoppingCart, Check, ArrowUpDown, Package, Plus, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface Props {
  plan: WeeklyPlan
  activeDays: DayOfWeek[]
}

interface AggregatedIngredient {
  name: string
  quantity: number
  unit: string
  quantityDisplay: string
  estimatedCostNZD: number
  checked: boolean
  category: string
  isStaple: boolean
}

interface ManualItem {
  id: string
  name: string
  checked: boolean
}

const MANUAL_KEY = 'mealprep_manual_shopping'
const PANTRY_MOVED_KEY = 'mealprep_pantry_moved'
const CHECKED_KEY = 'mealprep_shopping_checked'

const CATEGORY_ORDER = ['Produce', 'Meat & Fish', 'Dairy & Eggs', 'Pantry', 'Bakery', 'Condiments & Sauces', 'Other']

const STAPLE_NAMES = /\b(salt|pepper|black pepper|white pepper|olive oil|vegetable oil|canola oil|sesame oil|coconut oil|oil|cumin|paprika|turmeric|oregano|thyme|basil|coriander powder|garlic powder|onion powder|chilli flakes|chili flakes|cayenne|cinnamon|nutmeg|mixed herbs|italian seasoning|bay leaf|bay leaves|baking powder|baking soda|cornstarch|cornflour|flour|sugar|brown sugar|soy sauce|fish sauce|oyster sauce|worcestershire|vinegar|balsamic|stock cube|bouillon|sriracha|hot sauce|cooking spray)\b/i

function isStaple(ing: Ingredient): boolean {
  const n = ing.name.toLowerCase()
  const u = ing.unit.toLowerCase()
  if (STAPLE_NAMES.test(n)) return true
  if (['tsp', 'tbsp', 'teaspoon', 'tablespoon', 'pinch', 'dash'].includes(u)) return true
  return false
}

function getCategory(name: string): string {
  const n = name.toLowerCase()
  if (/\b(chicken|beef|lamb|pork|mince|steak|salmon|tuna|fish|prawn|bacon|sausage|turkey|tofu)\b/.test(n)) return 'Meat & Fish'
  if (/\b(milk|cheese|butter|cream|yoghurt|yogurt|egg|eggs)\b/.test(n)) return 'Dairy & Eggs'
  if (/\b(bread|bun|roll|wrap|tortilla|pita|sourdough)\b/.test(n)) return 'Bakery'
  if (/\b(sauce|soy sauce|oyster sauce|fish sauce|ketchup|mustard|mayo|mayonnaise|vinegar|oil|olive oil|sesame oil|sriracha|tabasco|hoisin|pesto|salsa)\b/.test(n)) return 'Condiments & Sauces'
  if (/\b(rice|pasta|noodle|flour|sugar|salt|pepper|spice|cumin|paprika|turmeric|coriander|oregano|thyme|basil|garlic powder|onion powder|chilli|chili|stock|broth|can|tinned|lentil|chickpea|bean|oat|breadcrumb|cornstarch|cornflour|coconut milk|soy|tamari)\b/.test(n)) return 'Pantry'
  if (/\b(apple|banana|orange|lemon|lime|berry|berries|mango|avocado|tomato|tomatoes|potato|potatoes|onion|onions|garlic|carrot|carrots|broccoli|spinach|lettuce|cucumber|capsicum|zucchini|mushroom|mushrooms|celery|pumpkin|corn|pea|peas|bean|beans|cabbage|cauliflower|ginger|spring onion|herbs|parsley|coriander leaf|mint|basil leaf)\b/.test(n)) return 'Produce'
  return 'Other'
}

const UNIT_ALIASES: Record<string, string> = {
  gram: 'g', grams: 'g',
  kilogram: 'kg', kilograms: 'kg',
  milliliter: 'ml', millilitre: 'ml', milliliters: 'ml', millilitres: 'ml',
  liter: 'L', litre: 'L', liters: 'L', litres: 'L', l: 'L',
  teaspoon: 'tsp', teaspoons: 'tsp',
  tablespoon: 'tbsp', tablespoons: 'tbsp',
  clove: 'cloves',
  piece: 'whole', pieces: 'whole',
  cup: 'cup', cups: 'cup',
}

const UNIT_TO_BASE: Record<string, { base: string; factor: number }> = {
  g: { base: 'g', factor: 1 }, kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 }, L: { base: 'ml', factor: 1000 },
}
function toBase(qty: number, unit: string): { qty: number; unit: string } {
  const conv = UNIT_TO_BASE[unit]
  return conv ? { qty: qty * conv.factor, unit: conv.base } : { qty, unit }
}
function fromBase(qty: number, unit: string): { qty: number; unit: string } {
  if (unit === 'g' && qty >= 1000) return { qty: qty / 1000, unit: 'kg' }
  if (unit === 'ml' && qty >= 1000) return { qty: qty / 1000, unit: 'L' }
  return { qty, unit }
}

function normalizeUnit(unit: string): string {
  return UNIT_ALIASES[unit.toLowerCase().trim()] ?? unit.toLowerCase().trim()
}

const PREP_PREFIX = /^(?:(?:freshly|finely|roughly|coarsely|thinly|lightly)\s+)?(?:minced|diced|chopped|sliced|crushed|grated|shredded|peeled|trimmed|halved|quartered|cubed|softened|ground|cooked)\s+/i
const PREP_SUFFIX = /,\s*(?:minced|diced|chopped|sliced|crushed|grated|shredded|peeled|trimmed|halved|quartered|cubed|softened|ground|cooked)$/i

function normalizeIngredientName(name: string): string {
  let n = name.trim()
  n = n.replace(PREP_SUFFIX, '')
  n = n.replace(PREP_PREFIX, '')
  n = n.replace(/^garlic\s+cloves?$/i, 'garlic')
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
}

function fmtQty(qty: number): string {
  return qty % 1 === 0 ? String(qty) : qty.toFixed(qty < 10 ? 1 : 0)
}

function aggregateIngredients(plan: WeeklyPlan, activeDays: DayOfWeek[]): AggregatedIngredient[] {
  const nameMap = new Map<string, { normName: string; unitBuckets: Map<string, { qty: number; unit: string }>; cost: number; ing: Ingredient }>()

  plan.slots.filter(s => activeDays.includes(s.day)).forEach(slot => {
    if (!slot.recipe) return
    if (!Array.isArray(slot.recipe.ingredients)) return
    slot.recipe.ingredients.forEach(ing => {
      const normName = normalizeIngredientName(ing.name)
      const normUnit = normalizeUnit(ing.unit)
      const { qty: bQty, unit: bUnit } = toBase(ing.quantity, normUnit)
      const nameKey = normName.toLowerCase()

      if (!nameMap.has(nameKey)) {
        nameMap.set(nameKey, { normName, unitBuckets: new Map(), cost: 0, ing })
      }
      const entry = nameMap.get(nameKey)!
      entry.cost += ing.estimatedCostNZD
      const bucket = entry.unitBuckets.get(bUnit)
      if (bucket) {
        bucket.qty += bQty
      } else {
        entry.unitBuckets.set(bUnit, { qty: bQty, unit: bUnit })
      }
    })
  })

  return Array.from(nameMap.values()).map(({ normName, unitBuckets, cost, ing }) => {
    const parts = Array.from(unitBuckets.values()).map(({ qty, unit }) => {
      const { qty: dQty, unit: dUnit } = fromBase(qty, unit)
      return { qty: dQty, unit: dUnit }
    })

    const quantityDisplay = parts.map(p => `${fmtQty(p.qty)} ${p.unit}`).join(' + ')
    const { qty: primaryQty, unit: primaryUnit } = parts[0]

    return {
      name: normName,
      quantity: primaryQty,
      unit: primaryUnit,
      quantityDisplay,
      estimatedCostNZD: cost,
      checked: false,
      category: getCategory(normName),
      isStaple: isStaple({ ...ing, name: normName, unit: primaryUnit }),
    }
  })
}

type SortMode = 'category' | 'name' | 'cost'

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
}

export default function ShoppingList({ plan, activeDays }: Props) {
  const base = aggregateIngredients(plan, activeDays)
  const [items, setItems] = useState<AggregatedIngredient[]>(base.map(i => ({ ...i, checked: false })))
  const [sortMode, setSortMode] = useState<SortMode>('category')
  const [pantryExpanded, setPantryExpanded] = useState(true)
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [pantryMoved, setPantryMoved] = useState<Set<string>>(new Set())
  const [newItemText, setNewItemText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setManualItems(loadFromStorage<ManualItem[]>(MANUAL_KEY, []))
    setPantryMoved(new Set(loadFromStorage<string[]>(PANTRY_MOVED_KEY, [])))
    const checkedNames = new Set(loadFromStorage<string[]>(CHECKED_KEY, []))
    if (checkedNames.size > 0) {
      setItems(prev => prev.map(i => ({ ...i, checked: checkedNames.has(i.name) })))
    }
  }, [])

  const saveManual = (updated: ManualItem[]) => {
    setManualItems(updated)
    saveToStorage(MANUAL_KEY, updated)
  }

  const savePantryMoved = (updated: Set<string>) => {
    setPantryMoved(updated)
    saveToStorage(PANTRY_MOVED_KEY, Array.from(updated))
  }

  const toggle = (name: string) => {
    setItems(prev => {
      const updated = prev.map(item => item.name === name ? { ...item, checked: !item.checked } : item)
      saveToStorage(CHECKED_KEY, updated.filter(i => i.checked).map(i => i.name))
      return updated
    })
  }

  const toggleManual = (id: string) => {
    saveManual(manualItems.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  const addItem = () => {
    const text = newItemText.trim()
    if (!text) return
    const item: ManualItem = { id: `${Date.now()}`, name: text, checked: false }
    saveManual([...manualItems, item])
    setNewItemText('')
    inputRef.current?.focus()
  }

  const removeManual = (id: string) => {
    saveManual(manualItems.filter(i => i.id !== id))
  }

  const addPantryToList = (name: string) => {
    const updated = new Set(pantryMoved)
    updated.add(name)
    savePantryMoved(updated)
  }

  const removePantryFromList = (name: string) => {
    const updated = new Set(pantryMoved)
    updated.delete(name)
    savePantryMoved(updated)
    setItems(prev => {
      const next = prev.map(item => item.name === name ? { ...item, checked: false } : item)
      saveToStorage(CHECKED_KEY, next.filter(i => i.checked).map(i => i.name))
      return next
    })
  }

  const buyItems = items.filter(i => !i.isStaple || pantryMoved.has(i.name))
  const stapleItems = items.filter(i => i.isStaple && !pantryMoved.has(i.name))

  const totalCost = buyItems.reduce((sum, i) => sum + i.estimatedCostNZD, 0)
  const checkedCount = [...buyItems, ...manualItems].filter(i => i.checked).length
  const totalCount = buyItems.length + manualItems.length

  if (items.length === 0 && manualItems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ShoppingCart size={40} className="mb-3 opacity-40" />
          <p className="text-sm">Add meals to your planner to generate a shopping list</p>
        </div>
        <AddItemRow value={newItemText} onChange={setNewItemText} onAdd={addItem} inputRef={inputRef} />
      </div>
    )
  }

  const sorted = [...buyItems].sort((a, b) => {
    if (sortMode === 'category') {
      const ci = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
      return ci !== 0 ? ci : a.name.localeCompare(b.name)
    }
    if (sortMode === 'cost') return b.estimatedCostNZD - a.estimatedCostNZD
    return a.name.localeCompare(b.name)
  })

  const grouped = sortMode === 'category'
    ? CATEGORY_ORDER.reduce<Record<string, AggregatedIngredient[]>>((acc, cat) => {
        const group = sorted.filter(i => i.category === cat)
        if (group.length > 0) acc[cat] = group
        return acc
      }, {})
    : null

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-900">Shopping List</h2>
        <div className="text-right">
          <div className="text-sm font-bold text-emerald-600">${totalCost.toFixed(2)} NZD</div>
          <div className="text-xs text-gray-400">{checkedCount}/{totalCount} done</div>
        </div>
      </div>

      <div className="text-xs text-gray-400 italic">Prices are AI-estimated NZD averages — not real-time supermarket data.</div>

      {/* Add item input */}
      <AddItemRow value={newItemText} onChange={setNewItemText} onAdd={addItem} inputRef={inputRef} />

      <div className="flex gap-2 items-center">
        <ArrowUpDown size={13} className="text-gray-400" />
        {(['category', 'name', 'cost'] as SortMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sortMode === mode ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {mode === 'category' ? 'By Type' : mode === 'name' ? 'A–Z' : 'By Cost'}
          </button>
        ))}
      </div>

      {checkedCount > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(checkedCount / totalCount) * 100}%` }} />
        </div>
      )}

      {/* Recipe-generated items */}
      {grouped ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-1">{cat}</div>
              <div className="space-y-1">
                {catItems.map(item => (
                  <ShoppingItem
                    key={`${item.name}-${item.unit}`}
                    item={item}
                    onToggle={() => toggle(item.name)}
                    fromPantry={pantryMoved.has(item.name)}
                    onRemoveFromList={pantryMoved.has(item.name) ? () => removePantryFromList(item.name) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map(item => (
            <ShoppingItem
              key={`${item.name}-${item.unit}`}
              item={item}
              onToggle={() => toggle(item.name)}
              fromPantry={pantryMoved.has(item.name)}
              onRemoveFromList={pantryMoved.has(item.name) ? () => removePantryFromList(item.name) : undefined}
            />
          ))}
        </div>
      )}

      {/* Manual items */}
      {manualItems.length > 0 && (
        <div>
          {buyItems.length > 0 && <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-1">Added manually</div>}
          <div className="space-y-1">
            {manualItems.map(item => (
              <ManualItemRow key={item.id} item={item} onToggle={() => toggleManual(item.id)} onRemove={() => removeManual(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Pantry staples */}
      {stapleItems.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setPantryExpanded(p => !p)}
            className="flex items-center gap-2 w-full text-left mb-2"
          >
            <Package size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
              Check your pantry ({stapleItems.length})
            </span>
            <span className="text-xs text-gray-400 ml-auto">{pantryExpanded ? '▲' : '▼'}</span>
          </button>
          {pantryExpanded && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-wrap gap-2">
              {stapleItems.map(item => (
                <button
                  key={item.name}
                  onClick={() => addPantryToList(item.name)}
                  className="flex items-center gap-1 text-xs bg-white border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-medium hover:bg-amber-100 hover:border-amber-400 transition-colors active:scale-95"
                  title="Tap to add to shopping list"
                >
                  <Plus size={10} />
                  {item.name}
                </button>
              ))}
              <p className="w-full text-xs text-amber-500 mt-1">Tap any item to add it to your list</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddItemRow({ value, onChange, onAdd, inputRef }: {
  value: string
  onChange: (v: string) => void
  onAdd: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onAdd()}
        placeholder="Add an item..."
        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
      />
      <button
        onClick={onAdd}
        disabled={!value.trim()}
        className="flex items-center gap-1 px-3 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-emerald-600 transition-colors"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

function ShoppingItem({ item, onToggle, fromPantry, onRemoveFromList }: {
  item: AggregatedIngredient
  onToggle: () => void
  fromPantry?: boolean
  onRemoveFromList?: () => void
}) {
  return (
    <div className={`flex items-center gap-1 p-3 rounded-xl transition-all ${
      item.checked ? 'bg-gray-50 opacity-50' : 'bg-white border border-gray-100 shadow-sm'
    }`}>
      <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left min-w-0">
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
        }`}>
          {item.checked && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {item.name}
          </span>
          {fromPantry && <span className="ml-1.5 text-xs text-amber-500">pantry</span>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm text-gray-600">{item.quantityDisplay}</div>
          <div className="text-xs text-gray-400">~${item.estimatedCostNZD.toFixed(2)}</div>
        </div>
      </button>
      {onRemoveFromList && (
        <button
          onClick={onRemoveFromList}
          className="flex-shrink-0 ml-1 text-gray-300 hover:text-red-400 transition-colors p-1"
          title="Remove from list"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

function ManualItemRow({ item, onToggle, onRemove }: { item: ManualItem; onToggle: () => void; onRemove: () => void }) {
  return (
    <div className={`flex items-center gap-1 p-3 rounded-xl transition-all ${
      item.checked ? 'bg-gray-50 opacity-50' : 'bg-white border border-gray-100 shadow-sm'
    }`}>
      <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left min-w-0">
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
        }`}>
          {item.checked && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
        <span className={`text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {item.name}
        </span>
      </button>
      <button
        onClick={onRemove}
        className="flex-shrink-0 ml-1 text-gray-300 hover:text-red-400 transition-colors p-1"
        title="Remove item"
      >
        <X size={13} />
      </button>
    </div>
  )
}
