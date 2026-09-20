import { NUTRIENT_DEFS } from '../data/nutrients'

const VALID_COLORS = ['mango', 'berry', 'kiwi', 'sky']

// Builds the copy-pasteable prompt users can hand to an LLM to generate food JSON
// in exactly the shape parseFoodJson() below accepts.
export function buildFoodJsonPrompt(foodNames = '') {
  const nutrientLines = NUTRIENT_DEFS.map((n) => `    "${n.key}": number   // ${n.label}, ${n.unit} per 100g`).join('\n')
  const examplePrompt = foodNames.trim() || 'Grilled salmon, Quinoa, Mango'

  return `You generate nutrition data as strict JSON for a calorie tracker app. No prose, no markdown fences, no comments in the actual output — JSON only.

Return a JSON ARRAY, one object per food, in this exact shape:

[
  {
    "name": string,                 // e.g. "Grilled Salmon"
    "color": "mango" | "berry" | "kiwi" | "sky",  // pick whichever fits, purely cosmetic
    "portions": [
      { "label": string, "grams": number }   // at least one portion; always include a "100 g" portion plus any common serving (e.g. "1 medium", "1 cup", "1 fillet")
    ],
    "nutrients_per_100g": {
${nutrientLines}
    }
  }
]

Rules:
- All nutrient values are per 100g of the food, using the exact units noted above (g, mg, or mcg) — do not switch units.
- Use 0 for any nutrient that is genuinely absent or negligible; never omit a key.
- Use realistic values from standard food composition data (e.g. USDA FoodData Central) rounded to 1-2 significant decimals.
- "portions" should reflect how people actually measure that food (not just 100g) — e.g. "1 medium (118g)", "1 cup (240g)", "1 slice (28g)".
- Output valid JSON only: double-quoted keys/strings, no trailing commas, no comments, no surrounding text.

Foods to generate: ${examplePrompt}`
}

function toNumber(value, fallback = 0) {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(n) ? n : fallback
}

// Normalizes one parsed JSON object into the app's internal food shape.
// Throws a descriptive Error if the object is missing required fields.
export function normalizeFoodJson(raw, index = 0) {
  const label = raw?.name ? `"${raw.name}"` : `food #${index + 1}`

  if (!raw || typeof raw !== 'object') {
    throw new Error(`${label}: expected an object`)
  }
  if (!raw.name || typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error(`${label}: missing "name"`)
  }

  const rawPortions = Array.isArray(raw.portions) ? raw.portions : []
  const portions = rawPortions
    .filter((p) => p && p.label && Number(p.grams) > 0)
    .map((p, i) => ({ id: `p${i}`, label: String(p.label).trim(), grams: toNumber(p.grams) }))

  if (portions.length === 0) {
    portions.push({ id: 'p0', label: '100 g', grams: 100 })
  }

  const nutrientSource = raw.nutrients_per_100g || raw.nutrients || {}
  const nutrients = {}
  for (const def of NUTRIENT_DEFS) {
    nutrients[def.key] = toNumber(nutrientSource[def.key], 0)
  }

  if (!nutrientSource.calories && nutrientSource.calories !== 0) {
    throw new Error(`${label}: missing "nutrients_per_100g.calories"`)
  }

  const color = VALID_COLORS.includes(raw.color) ? raw.color : VALID_COLORS[index % VALID_COLORS.length]

  return {
    name: raw.name.trim(),
    color,
    portions,
    defaultPortionId: portions[0].id,
    nutrients,
  }
}

// Parses raw JSON text (a single food object or an array of them) into
// an array of normalized food objects, or throws with a readable message.
export function parseFoodJson(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That isn't valid JSON — check for missing commas, quotes, or brackets.")
  }

  const list = Array.isArray(data) ? data : [data]
  if (list.length === 0) {
    throw new Error('No foods found in that JSON.')
  }
  return list.map((item, i) => normalizeFoodJson(item, i))
}
