// Triggers a browser download of `data` as a pretty-printed JSON file.
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Reads a File object (from an <input type="file">) as text.
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Couldn't read that file."))
    reader.readAsText(file)
  })
}

// Builds a self-contained snapshot of one day: its log entries, water, and
// full copies of every food those entries reference, so the file can be
// re-imported anywhere without missing data.
export function buildDayExport(date, entries, foods, waterMl) {
  const foodIds = new Set(entries.map((e) => e.foodId))
  const referencedFoods = foods.filter((f) => foodIds.has(f.id))
  return {
    type: 'bite-day-export',
    version: 1,
    date,
    waterMl: waterMl || 0,
    entries: entries.map(({ foodId, portionId, quantity, customGrams, meal }) => ({
      foodId,
      portionId,
      quantity,
      customGrams,
      meal,
    })),
    foods: referencedFoods,
  }
}

export function parseDayImport(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That isn't valid JSON — check the file wasn't edited or truncated.")
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('This file does not look like a day export.')
  }
  if (!data.date || typeof data.date !== 'string') {
    throw new Error('This file is missing its "date" field.')
  }
  if (!Array.isArray(data.entries)) {
    throw new Error('This file is missing its "entries" array.')
  }
  return {
    date: data.date,
    waterMl: Number.isFinite(data.waterMl) ? data.waterMl : 0,
    entries: data.entries,
    foods: Array.isArray(data.foods) ? data.foods : [],
  }
}

// Exports the food library in the same shape the AI-prompt/JSON-paste
// importer expects, so it can be re-imported through either path.
export function buildFoodLibraryExport(foods) {
  return foods.map(({ name, color, portions, nutrients }) => ({
    name,
    color,
    portions: portions.map(({ label, grams }) => ({ label, grams })),
    nutrients_per_100g: nutrients,
  }))
}
