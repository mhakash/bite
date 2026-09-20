import { useState } from 'react'
import Sheet from './Sheet'
import { MACRO_NUTRIENTS, MICRO_NUTRIENTS, emptyNutrientValues } from '../data/nutrients'
import { buildFoodJsonPrompt, parseFoodJson } from '../utils/foodJson'
import './FoodForm.css'

const COLORS = ['mango', 'berry', 'kiwi', 'sky']
let portionSeq = 0

function newPortion(label = '', grams = '') {
  portionSeq += 1
  return { id: `tmp-${portionSeq}`, label, grams }
}

export default function FoodForm({ open, onClose, onSave, onImportMany }) {
  const [mode, setMode] = useState('manual')
  const [name, setName] = useState('')
  const [color, setColor] = useState('mango')
  const [portions, setPortions] = useState([newPortion('100 g', 100)])
  const [nutrients, setNutrients] = useState(emptyNutrientValues())
  const [showMicros, setShowMicros] = useState(false)

  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [jsonNotice, setJsonNotice] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptFoodNames, setPromptFoodNames] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copy prompt')

  function reset() {
    setMode('manual')
    setName('')
    setColor('mango')
    setPortions([newPortion('100 g', 100)])
    setNutrients(emptyNutrientValues())
    setShowMicros(false)
    setJsonText('')
    setJsonError('')
    setJsonNotice('')
    setShowPrompt(false)
    setCopyLabel('Copy prompt')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function updatePortion(id, patch) {
    setPortions((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function addPortion() {
    setPortions((prev) => [...prev, newPortion()])
  }

  function removePortion(id) {
    setPortions((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev))
  }

  function updateNutrient(key, value) {
    setNutrients((prev) => ({ ...prev, [key]: value === '' ? 0 : parseFloat(value) }))
  }

  const validPortions = portions.filter((p) => p.label.trim() && Number(p.grams) > 0)
  const canSave = name.trim().length > 0 && validPortions.length > 0 && Number(nutrients.calories) >= 0

  function handleSave() {
    if (!canSave) return
    const food = {
      name: name.trim(),
      color,
      portions: validPortions.map((p, i) => ({ id: `p${i}`, label: p.label.trim(), grams: Number(p.grams) })),
      defaultPortionId: 'p0',
      nutrients,
    }
    onSave(food)
    reset()
  }

  function handleParseJson() {
    setJsonError('')
    setJsonNotice('')
    try {
      const foods = parseFoodJson(jsonText)
      if (foods.length > 1) {
        onImportMany(foods)
        reset()
        onClose()
        return
      }
      const [food] = foods
      setName(food.name)
      setColor(food.color)
      setPortions(food.portions.map((p) => ({ id: `tmp-${p.id}`, label: p.label, grams: p.grams })))
      setNutrients(food.nutrients)
      setJsonNotice(`Loaded "${food.name}" — review below, then save.`)
      setMode('manual')
    } catch (err) {
      setJsonError(err.message)
    }
  }

  async function handleCopyPrompt() {
    const prompt = buildFoodJsonPrompt(promptFoodNames)
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyLabel('Copied!')
    } catch {
      setCopyLabel('Select the text below and copy manually')
    }
    setTimeout(() => setCopyLabel('Copy prompt'), 2000)
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="New food"
      footer={
        mode === 'manual' ? (
          <button className="food-form__save" disabled={!canSave} onClick={handleSave}>
            Save food
          </button>
        ) : null
      }
    >
      <div className="food-form-tabs">
        <button className={`food-form-tab ${mode === 'manual' ? 'food-form-tab--active' : ''}`} onClick={() => setMode('manual')}>
          Manual
        </button>
        <button className={`food-form-tab ${mode === 'json' ? 'food-form-tab--active' : ''}`} onClick={() => setMode('json')}>
          Paste JSON
        </button>
      </div>

      {mode === 'json' && (
        <div className="json-import">
          <p className="json-import__hint">
            Paste a food object, or an array of several, in the app's JSON format. Not sure of the shape? Generate
            it with an LLM using the prompt below.
          </p>

          <button className="field__add-link" onClick={() => setShowPrompt((v) => !v)}>
            {showPrompt ? '− Hide AI prompt' : '+ Get an AI prompt to generate this'}
          </button>

          {showPrompt && (
            <div className="json-prompt-box">
              <label className="field" style={{ marginBottom: 4 }}>
                <span className="field__label">Foods to generate (comma separated)</span>
                <input
                  value={promptFoodNames}
                  onChange={(e) => setPromptFoodNames(e.target.value)}
                  placeholder="e.g. Grilled salmon, Quinoa, Mango"
                />
              </label>
              <pre className="json-prompt-box__text">{buildFoodJsonPrompt(promptFoodNames)}</pre>
              <button className="field__add-link" onClick={handleCopyPrompt}>
                {copyLabel}
              </button>
              <p className="json-import__hint">
                Copy this into ChatGPT, Claude, or any LLM, run it, then paste the JSON it returns below.
              </p>
            </div>
          )}

          <textarea
            className="json-import__textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={'{\n  "name": "Grilled Salmon",\n  "color": "sky",\n  "portions": [{ "label": "100 g", "grams": 100 }],\n  "nutrients_per_100g": { "calories": 208, "protein": 20, ... }\n}'}
            rows={10}
          />

          {jsonError && <p className="json-import__error">{jsonError}</p>}
          {jsonNotice && <p className="json-import__notice">{jsonNotice}</p>}

          <button className="food-form__save" onClick={handleParseJson} disabled={!jsonText.trim()}>
            Load JSON
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="food-form">
          <label className="field">
            <span className="field__label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grilled salmon" autoFocus />
          </label>

          <div className="field">
            <span className="field__label">Color tag</span>
            <div className="color-swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${color === c ? 'color-swatch--active' : ''}`}
                  style={{ background: `var(--${c})` }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Portions</span>
            <span className="field__hint">Save the ways you usually measure this food</span>
            {portions.map((p) => (
              <div className="portion-row" key={p.id}>
                <input
                  placeholder="Label (1 cup)"
                  value={p.label}
                  onChange={(e) => updatePortion(p.id, { label: e.target.value })}
                />
                <input
                  placeholder="grams"
                  type="number"
                  min="0"
                  value={p.grams}
                  onChange={(e) => updatePortion(p.id, { grams: e.target.value })}
                />
                <button className="portion-row__remove" onClick={() => removePortion(p.id)} disabled={portions.length === 1}>
                  ×
                </button>
              </div>
            ))}
            <button className="field__add-link" onClick={addPortion}>
              + Add another portion
            </button>
          </div>

          <div className="field">
            <span className="field__label">Nutrients per 100g</span>
            <div className="nutrient-grid">
              {MACRO_NUTRIENTS.map((n) => (
                <label className="nutrient-input" key={n.key}>
                  <span>{n.label}</span>
                  <div className="nutrient-input__row">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={nutrients[n.key] === 0 ? '' : nutrients[n.key]}
                      onChange={(e) => updateNutrient(n.key, e.target.value)}
                      placeholder="0"
                    />
                    <span className="nutrient-input__unit">{n.unit}</span>
                  </div>
                </label>
              ))}
            </div>

            <button className="field__add-link" onClick={() => setShowMicros((v) => !v)}>
              {showMicros ? '− Hide micronutrients' : '+ Add micronutrients (optional)'}
            </button>

            {showMicros && (
              <div className="nutrient-grid">
                {MICRO_NUTRIENTS.map((n) => (
                  <label className="nutrient-input" key={n.key}>
                    <span>{n.label}</span>
                    <div className="nutrient-input__row">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nutrients[n.key] === 0 ? '' : nutrients[n.key]}
                        onChange={(e) => updateNutrient(n.key, e.target.value)}
                        placeholder="0"
                      />
                      <span className="nutrient-input__unit">{n.unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
