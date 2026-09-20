import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet'
import IconButton from './IconButton'
import { formatDisplayDate } from '../utils/date'
import './SettingsSheet.css'

const FIELDS = [
  { key: 'calorieGoal', label: 'Calorie goal', unit: 'kcal' },
  { key: 'proteinGoal', label: 'Protein goal', unit: 'g' },
  { key: 'carbsGoal', label: 'Carbs goal', unit: 'g' },
  { key: 'fatGoal', label: 'Fat goal', unit: 'g' },
  { key: 'waterGoalMl', label: 'Water goal', unit: 'ml' },
]

export default function SettingsSheet({
  open,
  settings,
  selectedDate,
  dayEntryCount,
  foodCount,
  notice,
  onDismissNotice,
  onClose,
  onSave,
  onExportDay,
  onImportDayFile,
  onExportFoods,
  onImportFoodsFile,
}) {
  const [form, setForm] = useState(settings)
  const dayFileInput = useRef(null)
  const foodsFileInput = useRef(null)

  useEffect(() => {
    if (open) setForm(settings)
  }, [open, settings])

  function handleSave() {
    onSave(form)
    onClose()
  }

  function handleDayFileChange(e) {
    const file = e.target.files?.[0]
    if (file) onImportDayFile(file)
    e.target.value = ''
  }

  function handleFoodsFileChange(e) {
    const file = e.target.files?.[0]
    if (file) onImportFoodsFile(file)
    e.target.value = ''
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Goals & settings"
      footer={
        <button className="settings-save" onClick={handleSave}>
          Save
        </button>
      }
    >
      <div className="settings-form">
        {FIELDS.map((f) => (
          <label className="settings-field" key={f.key}>
            <span>{f.label}</span>
            <div className="settings-field__input">
              <input
                type="number"
                min="0"
                value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
              />
              <span className="settings-field__unit">{f.unit}</span>
            </div>
          </label>
        ))}

        <div className="settings-divider" />

        <div className="data-section">
          <h4 className="data-section__title">Backup & transfer</h4>

          {notice && (
            <div className="data-notice">
              <span>{notice}</span>
              <IconButton
                icon="close"
                variant="inline"
                size={20}
                style={{ color: 'var(--sky)' }}
                onClick={onDismissNotice}
                aria-label="Dismiss"
              />
            </div>
          )}

          <div className="data-row">
            <div className="data-row__text">
              <span className="data-row__label">Export {formatDisplayDate(selectedDate)}</span>
              <span className="data-row__hint">
                {dayEntryCount} entr{dayEntryCount === 1 ? 'y' : 'ies'} · saves as a .json file
              </span>
            </div>
            <button className="data-row__btn" onClick={onExportDay} disabled={dayEntryCount === 0}>
              Export
            </button>
          </div>

          <div className="data-row">
            <div className="data-row__text">
              <span className="data-row__label">Import a day</span>
              <span className="data-row__hint">Adds entries + foods from a day export file</span>
            </div>
            <button className="data-row__btn" onClick={() => dayFileInput.current?.click()}>
              Choose file
            </button>
            <input
              ref={dayFileInput}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleDayFileChange}
            />
          </div>

          <div className="data-row">
            <div className="data-row__text">
              <span className="data-row__label">Export food library</span>
              <span className="data-row__hint">{foodCount} foods · re-importable via file or paste</span>
            </div>
            <button className="data-row__btn" onClick={onExportFoods} disabled={foodCount === 0}>
              Export
            </button>
          </div>

          <div className="data-row">
            <div className="data-row__text">
              <span className="data-row__label">Import food library</span>
              <span className="data-row__hint">Merges foods, skipping duplicates by name</span>
            </div>
            <button className="data-row__btn" onClick={() => foodsFileInput.current?.click()}>
              Choose file
            </button>
            <input
              ref={foodsFileInput}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleFoodsFileChange}
            />
          </div>
        </div>

        <p className="settings-note">
          Your data lives only in this browser's local storage. Clearing site data will erase it, so export
          important logs elsewhere if you need a backup.
        </p>
      </div>
    </Sheet>
  )
}
