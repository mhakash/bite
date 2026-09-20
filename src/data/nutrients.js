// Nutrient definitions with units and daily values (FDA-style, 2000kcal adult reference)
// All food nutrient values are stored PER 100g of the food.

export const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat']

export const NUTRIENT_DEFS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', dv: 2000, group: 'macro' },
  { key: 'protein', label: 'Protein', unit: 'g', dv: 50, group: 'macro' },
  { key: 'carbs', label: 'Total Carbohydrate', unit: 'g', dv: 275, group: 'macro' },
  { key: 'fiber', label: 'Dietary Fiber', unit: 'g', dv: 28, group: 'macro' },
  { key: 'sugar', label: 'Total Sugars', unit: 'g', dv: 50, group: 'macro' },
  { key: 'fat', label: 'Total Fat', unit: 'g', dv: 78, group: 'macro' },
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', dv: 20, group: 'macro' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', dv: 300, group: 'macro' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', dv: 2300, group: 'macro' },

  { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', dv: 900, group: 'micro' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', dv: 90, group: 'micro' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', dv: 20, group: 'micro' },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', dv: 15, group: 'micro' },
  { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', dv: 120, group: 'micro' },
  { key: 'thiamin', label: 'Thiamin (B1)', unit: 'mg', dv: 1.2, group: 'micro' },
  { key: 'riboflavin', label: 'Riboflavin (B2)', unit: 'mg', dv: 1.3, group: 'micro' },
  { key: 'niacin', label: 'Niacin (B3)', unit: 'mg', dv: 16, group: 'micro' },
  { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg', dv: 1.7, group: 'micro' },
  { key: 'folate', label: 'Folate', unit: 'mcg', dv: 400, group: 'micro' },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg', dv: 2.4, group: 'micro' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', dv: 1300, group: 'micro' },
  { key: 'iron', label: 'Iron', unit: 'mg', dv: 18, group: 'micro' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', dv: 420, group: 'micro' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', dv: 4700, group: 'micro' },
  { key: 'zinc', label: 'Zinc', unit: 'mg', dv: 11, group: 'micro' },
]

export const NUTRIENT_MAP = Object.fromEntries(NUTRIENT_DEFS.map((n) => [n.key, n]))

export const MACRO_NUTRIENTS = NUTRIENT_DEFS.filter((n) => n.group === 'macro')
export const MICRO_NUTRIENTS = NUTRIENT_DEFS.filter((n) => n.group === 'micro')

export function emptyNutrientValues() {
  return Object.fromEntries(NUTRIENT_DEFS.map((n) => [n.key, 0]))
}
