'use client'
import { WeeklyPlan, Ingredient } from '@/lib/types'
import { ShoppingCart, Check, ArrowUpDown, Package } from 'lucide-react'
import { useState } from 'react'

interface Props {
  plan: WeeklyPlan
}

interface AggregatedIngredient extends Ingredient {
  checked: boolean
  category: string
  isStaple: boolean
}

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

function aggregateIngredients(plan: WeeklyPlan): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>()

  plan.slots.forEach(slot => {
    if (!slot.recipe) return
    slot.recipe.ingredients.forEach(ing => {
      const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`
      if (map.has(key)) {
        const existing = map.get(key)!
        existing.quantity += ing.quantity
        existing.estimatedCostNZD += ing.estimatedCostNZD
      } else {
        map.set(key, { ...ing, checked: false, category: getCategory(ing.name), isStaple: isStaple(ing) })
      }
    })
  })

  return Array.from(map.values())
}

type SortMode = 'category' | 'name' | 'cost'

export default function ShoppingList({ plan }: Props) {
  const base = aggregateIngredients(plan)
  const [items, setItems] = useState<AggregatedIngredient[]>(base.map(i => ({ ...i, checked: false })))
  const [sortMode, setSortMode] = useState<SortMode>('category')
  const [pantryExpanded, setPantryExpanded] = useState(true)

  const buyItems = items.filter(i => !i.isStaple)
  const stapleItems = items.filter(i => i.isStaple)
  const totalCost = buyItems.reduce((sum, i) => sum + i.estimatedCostNZD, 0)
  const checkedCount = buyItems.filter(i => i.checked).length

  if (items.length === 0 && stapleItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <ShoppingCart size={40} className="mb-3 opacity-40" />
        <p className="text-sm">Add meals to your planner to generate a shopping list</p>
      </div>
    )
  }

  const toggle = (id: string) => {
    setItems(prev => prev.map(item => item.name === id ? { ...item, checked: !item.checked } : item))
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
        const group = sorted.filter(i => i.category === cat && !i.isStaple)
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
          <div className="text-xs text-gray-400">{checkedCount}/{buyItems.length} done</div>
        </div>
      </div>

      <div className="text-xs text-gray-400 italic">Prices are AI-estimated NZD averages — not real-time supermarket data.</div>

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
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(checkedCount / buyItems.length) * 100}%` }} />
        </div>
      )}

      {grouped ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-1">{cat}</div>
              <div className="space-y-1">
                {catItems.map((item) => (
                  <ShoppingItem key={`${item.name}-${item.unit}`} item={item} onToggle={() => toggle(item.name)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((item) => (
            <ShoppingItem key={`${item.name}-${item.unit}`} item={item} onToggle={() => toggle(item.name)} />
          ))}
        </div>
      )}

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
                <span key={item.name} className="text-xs bg-white border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ShoppingItem({ item, onToggle }: { item: AggregatedIngredient; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
        item.checked ? 'bg-gray-50 opacity-50' : 'bg-white border border-gray-100 shadow-sm'
      }`}
    >
      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
      }`}>
        {item.checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {item.name}
        </span>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm text-gray-600">
          {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}
        </div>
        <div className="text-xs text-gray-400">~${item.estimatedCostNZD.toFixed(2)}</div>
      </div>
    </button>
  )
}
