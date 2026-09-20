import { NUTRIENT_DEFS } from '../data/nutrients'

// Scale a food's per-100g nutrients to an actual gram amount.
export function scaleNutrients(nutrients, grams) {
  const factor = grams / 100
  const out = {}
  for (const def of NUTRIENT_DEFS) {
    out[def.key] = (nutrients[def.key] || 0) * factor
  }
  return out
}

export function gramsForEntry(food, entry) {
  if (entry.customGrams != null) return entry.customGrams
  const portion = food.portions.find((p) => p.id === entry.portionId) || food.portions[0]
  return (portion?.grams || 100) * entry.quantity
}

export function nutrientsForEntry(food, entry) {
  const grams = gramsForEntry(food, entry)
  return scaleNutrients(food.nutrients, grams)
}

export function sumNutrients(list) {
  const totals = {}
  for (const def of NUTRIENT_DEFS) totals[def.key] = 0
  for (const n of list) {
    for (const def of NUTRIENT_DEFS) totals[def.key] += n[def.key] || 0
  }
  return totals
}

export function round(value, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}
