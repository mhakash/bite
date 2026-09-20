import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sheet from './Sheet'
import { round, scaleNutrients } from '../utils/nutrition'
import './AddEntrySheet.css'

export default function AddEntrySheet({ open, meal, foods, recentFoodIds, onClose, onLog, onCreateNew }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [portionId, setPortionId] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [customGrams, setCustomGrams] = useState('')

  const isCustom = portionId === 'custom'

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const recent = recentFoodIds.map((id) => foods.find((f) => f.id === id)).filter(Boolean)
      return recent.length ? recent : foods.slice(0, 8)
    }
    return foods.filter((f) => f.name.toLowerCase().includes(q))
  }, [query, foods, recentFoodIds])

  function pickFood(food) {
    setSelected(food)
    setPortionId(food.defaultPortionId || food.portions[0]?.id)
    setQuantity(1)
    setCustomGrams('')
  }

  function reset() {
    setQuery('')
    setSelected(null)
    setPortionId(null)
    setQuantity(1)
    setCustomGrams('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleLog() {
    if (!selected) return
    if (isCustom) {
      const grams = Number(customGrams)
      if (!grams || grams <= 0) return
      onLog({ foodId: selected.id, customGrams: grams, meal })
    } else {
      if (!portionId) return
      onLog({ foodId: selected.id, portionId, quantity, meal })
    }
    reset()
  }

  const portion = selected?.portions.find((p) => p.id === portionId)
  const grams = isCustom ? Number(customGrams) || 0 : (portion?.grams || 0) * quantity
  const previewNutrients = selected ? scaleNutrients(selected.nutrients, grams) : null
  const canLog = isCustom ? Number(customGrams) > 0 : !!portionId

  return (
    <Sheet open={open} onClose={handleClose} title={selected ? selected.name : 'Add food'}>
      {!selected && (
        <div className="add-entry">
          <input
            className="add-entry__search"
            placeholder="Search your foods…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className="add-entry__section-label">{query ? 'Results' : 'Recent & quick add'}</span>
          <div className="add-entry__list">
            {results.map((food) => (
              <button key={food.id} className="add-entry__item" onClick={() => pickFood(food)}>
                <span className="add-entry__item-dot" style={{ background: `var(--${food.color || 'mango'})` }} />
                <span className="add-entry__item-name">{food.name}</span>
                <span className="add-entry__item-cals mono">{round(food.nutrients.calories)} /100g</span>
              </button>
            ))}
            {results.length === 0 && <p className="add-entry__empty">No foods match "{query}"</p>}
          </div>
          <button className="add-entry__create" onClick={onCreateNew}>
            + Create a new food
          </button>
        </div>
      )}

      {selected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="add-entry-detail">
          <button className="add-entry-detail__back" onClick={() => setSelected(null)}>
            ‹ Back to search
          </button>

          <div className="add-entry-detail__portions">
            {selected.portions.map((p) => (
              <button
                key={p.id}
                className={`portion-chip ${p.id === portionId ? 'portion-chip--active' : ''}`}
                onClick={() => setPortionId(p.id)}
              >
                {p.label}
              </button>
            ))}
            <button
              className={`portion-chip ${isCustom ? 'portion-chip--active' : ''}`}
              onClick={() => {
                setPortionId('custom')
                if (!customGrams) setCustomGrams(String(portion?.grams || 100))
              }}
            >
              ✎ Custom amount
            </button>
          </div>

          {isCustom ? (
            <div className="add-entry-detail__custom">
              <span>Amount</span>
              <div className="custom-grams-input">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={customGrams}
                  onChange={(e) => setCustomGrams(e.target.value)}
                  autoFocus
                />
                <span className="custom-grams-input__unit">g</span>
              </div>
            </div>
          ) : (
            <div className="add-entry-detail__qty">
              <span>Quantity</span>
              <div className="qty-stepper">
                <button onClick={() => setQuantity((q) => Math.max(0.25, round(q - 0.25, 2)))}>−</button>
                <span className="mono">{quantity}</span>
                <button onClick={() => setQuantity((q) => round(q + 0.25, 2))}>+</button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {previewNutrients && (
              <motion.div
                key={`${portionId}-${quantity}-${customGrams}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="add-entry-detail__preview"
              >
                <div className="preview-stat">
                  <span className="preview-stat__val mono">{round(previewNutrients.calories)}</span>
                  <span className="preview-stat__label">kcal</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat__val mono" style={{ color: 'var(--accent-protein)' }}>
                    {round(previewNutrients.protein)}g
                  </span>
                  <span className="preview-stat__label">protein</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat__val mono" style={{ color: 'var(--accent-carbs)' }}>
                    {round(previewNutrients.carbs)}g
                  </span>
                  <span className="preview-stat__label">carbs</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat__val mono" style={{ color: 'var(--accent-fat)' }}>
                    {round(previewNutrients.fat)}g
                  </span>
                  <span className="preview-stat__label">fat</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button className="add-entry-detail__log" onClick={handleLog} disabled={!canLog}>
            Log it
          </button>
        </motion.div>
      )}
    </Sheet>
  )
}
