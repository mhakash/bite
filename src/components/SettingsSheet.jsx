import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import './SettingsSheet.css'

const FIELDS = [
  { key: 'calorieGoal', label: 'Calorie goal', unit: 'kcal' },
  { key: 'proteinGoal', label: 'Protein goal', unit: 'g' },
  { key: 'carbsGoal', label: 'Carbs goal', unit: 'g' },
  { key: 'fatGoal', label: 'Fat goal', unit: 'g' },
  { key: 'waterGoalMl', label: 'Water goal', unit: 'ml' },
]

export default function SettingsSheet({ open, settings, onClose, onSave }) {
  const [form, setForm] = useState(settings)

  useEffect(() => {
    if (open) setForm(settings)
  }, [open, settings])

  function handleSave() {
    onSave(form)
    onClose()
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
        <p className="settings-note">
          Your data lives only in this browser's local storage. Clearing site data will erase it, so export
          important logs elsewhere if you need a backup.
        </p>
      </div>
    </Sheet>
  )
}
