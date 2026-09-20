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
      const withIds = newFoods.map((food) => ({ ...food, id: food.id || `f-${uuid()}` }))
      setFoods((prev) => [...prev, ...withIds])
      return withIds
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
    updateSettings(patch) {
      setSettings((prev) => ({ ...prev, ...patch }))
    },
    setWaterForDate(dateISO, ml) {
      setWater((prev) => ({ ...prev, [dateISO]: Math.max(0, ml) }))
    },
    setSelectedDate,
  }), [logs, setFoods, setLogs, setSettings, setWater, setSelectedDate])

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
