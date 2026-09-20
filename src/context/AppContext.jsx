import { createContext, useContext, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { SEED_FOODS } from '../data/seedFoods'
import { todayISO } from '../utils/date'

const AppContext = createContext(null)

const DEFAULT_SETTINGS = {
  calorieGoal: 2000,
  proteinGoal: 120,
  carbsGoal: 230,
  fatGoal: 65,
  waterGoalMl: 2500,
  name: '',
}

export const MEALS = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunrise' },
  { id: 'lunch', label: 'Lunch', icon: 'sun' },
  { id: 'dinner', label: 'Dinner', icon: 'moon' },
  { id: 'snack', label: 'Snacks', icon: 'sparkle' },
]

export function AppProvider({ children }) {
  const [foods, setFoods] = useLocalStorage('ct_foods', SEED_FOODS)
  const [logs, setLogs] = useLocalStorage('ct_logs', [])
  const [settings, setSettings] = useLocalStorage('ct_settings', DEFAULT_SETTINGS)
  const [water, setWater] = useLocalStorage('ct_water', {})
  const [selectedDate, setSelectedDate] = useLocalStorage('ct_selected_date', todayISO())

  const actions = useMemo(() => ({
    addFood(food) {
      const id = food.id || `f-${uuid()}`
      const withId = { ...food, id }
      setFoods((prev) => [...prev, withId])
      return withId
    },
    addFoods(newFoods) {
      const existingNames = new Set(foods.map((f) => f.name.toLowerCase()))
      const toAdd = []
      let skipped = 0
      for (const food of newFoods) {
        if (existingNames.has(food.name.toLowerCase())) {
          skipped += 1
          continue
        }
        existingNames.add(food.name.toLowerCase())
        toAdd.push({ ...food, id: `f-${uuid()}` })
      }
      if (toAdd.length) setFoods((prev) => [...prev, ...toAdd])
      return { added: toAdd.length, skipped }
    },
    updateFood(id, patch) {
      setFoods((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    },
    deleteFood(id) {
      setFoods((prev) => prev.filter((f) => f.id !== id))
    },
    addLogEntry(entry) {
      const withId = { id: `e-${uuid()}`, createdAt: Date.now(), ...entry }
      setLogs((prev) => [...prev, withId])
      return withId
    },
    updateLogEntry(id, patch) {
      setLogs((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    },
    removeLogEntry(id) {
      setLogs((prev) => prev.filter((e) => e.id !== id))
    },
    copyDay(fromISO, toISO) {
      const entries = logs.filter((e) => e.date === fromISO)
      const copies = entries.map((e) => ({ ...e, id: `e-${uuid()}`, date: toISO, createdAt: Date.now() }))
      setLogs((prev) => [...prev, ...copies])
      return copies.length
    },
    // Imports a day-export snapshot: merges its foods (skipping any that
    // match an existing food by name) and adds its entries under `date`.
    importDayData({ date, waterMl, entries, foods: importedFoods }) {
      const idMap = {}
      const toAdd = []
      for (const food of importedFoods) {
        const existing = foods.find((f) => f.name.toLowerCase() === food.name.toLowerCase())
        if (existing) {
          idMap[food.id] = existing.id
        } else {
          const newId = `f-${uuid()}`
          idMap[food.id] = newId
          toAdd.push({ ...food, id: newId })
        }
      }
      if (toAdd.length) setFoods((prev) => [...prev, ...toAdd])

      const newEntries = entries.map((e) => ({
        ...e,
        id: `e-${uuid()}`,
        foodId: idMap[e.foodId] || e.foodId,
        date,
        createdAt: Date.now(),
      }))
      setLogs((prev) => [...prev, ...newEntries])

      if (waterMl) setWater((prev) => ({ ...prev, [date]: waterMl }))

      return { addedFoods: toAdd.length, addedEntries: newEntries.length }
    },
    updateSettings(patch) {
      setSettings((prev) => ({ ...prev, ...patch }))
    },
    setWaterForDate(dateISO, ml) {
      setWater((prev) => ({ ...prev, [dateISO]: Math.max(0, ml) }))
    },
    setSelectedDate,
  }), [foods, logs, setFoods, setLogs, setSettings, setWater, setSelectedDate])

  const value = useMemo(() => ({
    foods,
    logs,
    settings,
    water,
    selectedDate,
    ...actions,
  }), [foods, logs, settings, water, selectedDate, actions])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
