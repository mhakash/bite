import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../api/client'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { todayISO } from '../utils/date'

const AppContext = createContext(null)

const EMPTY_SETTINGS = {
  calorieGoal: 2000,
  proteinGoal: 120,
  carbsGoal: 230,
  fatGoal: 65,
  waterGoalMl: 2500,
  name: '',
}

export function AppProvider({ children }) {
  // 'checking' while we try the refresh cookie on load, then 'authed' or 'anon'.
  const [authStatus, setAuthStatus] = useState('checking')
  const [authError, setAuthError] = useState('')

  const [foods, setFoods] = useState([])
  const [logs, setLogs] = useState([])
  const [meals, setMeals] = useState([])
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [water, setWater] = useState({})
  const [selectedDate, setSelectedDate] = useLocalStorage('ct_selected_date', todayISO())

  const loadBootstrap = useCallback(async () => {
    const data = await api.getBootstrap()
    setFoods(data.foods || [])
    setMeals(data.meals || [])
    setLogs(data.logs || [])
    setWater(data.water || {})
    setSettings(data.settings || EMPTY_SETTINGS)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function bootstrapFromExistingSession() {
      try {
        await api.refresh()
        if (cancelled) return
        await loadBootstrap()
        if (!cancelled) setAuthStatus('authed')
      } catch {
        if (!cancelled) setAuthStatus('anon')
      }
    }
    bootstrapFromExistingSession()
    return () => {
      cancelled = true
    }
  }, [loadBootstrap])

  const login = useCallback(
    async (username, password) => {
      setAuthError('')
      try {
        await api.login(username, password)
        await loadBootstrap()
        setAuthStatus('authed')
      } catch (err) {
        setAuthError(err.message || 'Login failed')
        throw err
      }
    },
    [loadBootstrap],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setFoods([])
      setLogs([])
      setMeals([])
      setWater({})
      setSettings(EMPTY_SETTINGS)
      setAuthStatus('anon')
    }
  }, [])

  const actions = useMemo(
    () => ({
      async addFood(food) {
        const created = await api.createFood(food)
        setFoods((prev) => [...prev, created])
        return created
      },
      async addFoods(newFoods) {
        const result = await api.bulkCreateFoods(newFoods)
        if (result.foods?.length) setFoods((prev) => [...prev, ...result.foods])
        return { added: result.added, skipped: result.skipped }
      },
      async updateFood(id, patch) {
        const updated = await api.updateFood(id, patch)
        setFoods((prev) => prev.map((f) => (f.id === id ? updated : f)))
        return updated
      },
      async deleteFood(id) {
        await api.deleteFood(id)
        setFoods((prev) => prev.filter((f) => f.id !== id))
      },
      async addLogEntry(entry) {
        const created = await api.createLog(entry)
        setLogs((prev) => [...prev, created])
        return created
      },
      async updateLogEntry(id, patch) {
        const updated = await api.updateLog(id, patch)
        setLogs((prev) => prev.map((e) => (e.id === id ? updated : e)))
        return updated
      },
      async removeLogEntry(id) {
        await api.deleteLog(id)
        setLogs((prev) => prev.filter((e) => e.id !== id))
      },
      async copyDay(fromISO, toISO) {
        const copies = await api.copyDay(fromISO, toISO)
        if (copies?.length) setLogs((prev) => [...prev, ...copies])
        return copies?.length || 0
      },
      async importDayData(payload) {
        const result = await api.importDay(payload)
        await loadBootstrap()
        return result
      },
      async updateSettings(patch) {
        const updated = await api.updateSettings(patch)
        setSettings(updated)
        return updated
      },
      async setWaterForDate(dateISO, ml) {
        const clamped = Math.max(0, ml)
        const updated = await api.setWater(dateISO, clamped)
        setWater((prev) => ({ ...prev, [dateISO]: updated.ml }))
      },
      async addMealType(meal) {
        const created = await api.createMeal(meal)
        setMeals((prev) => [...prev, created])
        return created
      },
      async updateMealType(id, patch) {
        const updated = await api.updateMeal(id, patch)
        setMeals((prev) => prev.map((m) => (m.id === id ? updated : m)))
        return updated
      },
      async deleteMealType(id) {
        await api.deleteMeal(id)
        setMeals((prev) => prev.filter((m) => m.id !== id))
      },
      setSelectedDate,
    }),
    [loadBootstrap, setSelectedDate],
  )

  const value = useMemo(
    () => ({
      authStatus,
      authError,
      login,
      logout,
      foods,
      logs,
      meals,
      settings,
      water,
      selectedDate,
      ...actions,
    }),
    [authStatus, authError, login, logout, foods, logs, meals, settings, water, selectedDate, actions],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
