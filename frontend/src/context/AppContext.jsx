import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/client'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { addDaysISO, todayISO } from '../utils/date'

const AppContext = createContext(null)

const TREND_DAYS = 7

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
  const [selectedDate, setSelectedDate] = useLocalStorage('ct_selected_date', todayISO())

  const queryClient = useQueryClient()
  const authed = authStatus === 'authed'
  const rangeStart = addDaysISO(selectedDate, -(TREND_DAYS - 1))

  useEffect(() => {
    let cancelled = false
    async function bootstrapFromExistingSession() {
      try {
        await api.refresh()
        if (!cancelled) setAuthStatus('authed')
      } catch {
        if (!cancelled) setAuthStatus('anon')
      }
    }
    bootstrapFromExistingSession()
    return () => {
      cancelled = true
    }
  }, [])

  const bootstrapQuery = useQuery({
    queryKey: ['bootstrap'],
    queryFn: api.getBootstrap,
    enabled: authed,
  })
  const foods = bootstrapQuery.data?.foods || []
  const meals = bootstrapQuery.data?.meals || []
  const settings = bootstrapQuery.data?.settings || EMPTY_SETTINGS

  // Logs for the trend window (ending on selectedDate) cover today's entries,
  // yesterday's (for the "copy yesterday" prompt), and the weekly chart —
  // never the user's whole history.
  const logsQuery = useQuery({
    queryKey: ['logs', rangeStart, selectedDate],
    queryFn: () => api.getLogsForRange(rangeStart, selectedDate),
    enabled: authed,
  })
  const logs = logsQuery.data || []

  const loggedDatesQuery = useQuery({
    queryKey: ['loggedDates'],
    queryFn: api.getLoggedDates,
    enabled: authed,
  })
  const loggedDates = useMemo(() => new Set(loggedDatesQuery.data || []), [loggedDatesQuery.data])

  const waterQuery = useQuery({
    queryKey: ['water', selectedDate],
    queryFn: () => api.getWater(selectedDate),
    enabled: authed,
  })
  const waterMl = waterQuery.data?.ml || 0

  const invalidateLogs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['logs'] })
    queryClient.invalidateQueries({ queryKey: ['loggedDates'] })
  }, [queryClient])

  const login = useCallback(
    async (username, password) => {
      setAuthError('')
      try {
        await api.login(username, password)
        setAuthStatus('authed')
      } catch (err) {
        setAuthError(err.message || 'Login failed')
        throw err
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      queryClient.clear()
      setAuthStatus('anon')
    }
  }, [queryClient])

  const addFoodMutation = useMutation({
    mutationFn: api.createFood,
    onSuccess: (created) => {
      queryClient.setQueryData(['bootstrap'], (prev) => prev && { ...prev, foods: [...prev.foods, created] })
    },
  })
  const addFoodsMutation = useMutation({
    mutationFn: api.bulkCreateFoods,
    onSuccess: (result) => {
      if (result.foods?.length) {
        queryClient.setQueryData(['bootstrap'], (prev) => prev && { ...prev, foods: [...prev.foods, ...result.foods] })
      }
    },
  })
  const updateFoodMutation = useMutation({
    mutationFn: ({ id, patch }) => api.updateFood(id, patch),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(['bootstrap'], (prev) => prev && {
        ...prev,
        foods: prev.foods.map((f) => (f.id === id ? updated : f)),
      })
    },
  })
  const deleteFoodMutation = useMutation({
    mutationFn: api.deleteFood,
    onSuccess: (_, id) => {
      queryClient.setQueryData(['bootstrap'], (prev) => prev && {
        ...prev,
        foods: prev.foods.filter((f) => f.id !== id),
      })
    },
  })

  const addLogEntryMutation = useMutation({
    mutationFn: api.createLog,
    onSuccess: invalidateLogs,
  })
  const updateLogEntryMutation = useMutation({
    mutationFn: ({ id, patch }) => api.updateLog(id, patch),
    onSuccess: invalidateLogs,
  })
  const removeLogEntryMutation = useMutation({
    mutationFn: api.deleteLog,
    onSuccess: invalidateLogs,
  })
  const copyDayMutation = useMutation({
    mutationFn: ({ fromISO, toISO }) => api.copyDay(fromISO, toISO),
    onSuccess: invalidateLogs,
  })

  const importDayMutation = useMutation({
    mutationFn: api.importDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
      invalidateLogs()
      queryClient.invalidateQueries({ queryKey: ['water'] })
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['bootstrap'], (prev) => prev && { ...prev, settings: updated })
    },
  })

  const setWaterMutation = useMutation({
    mutationFn: ({ date, ml }) => api.setWater(date, ml),
    onSuccess: (updated, { date }) => {
      queryClient.setQueryData(['water', date], updated)
    },
  })

  const addMealMutation = useMutation({
    mutationFn: api.createMeal,
    onSuccess: (created) => {
      queryClient.setQueryData(['bootstrap'], (prev) => prev && { ...prev, meals: [...prev.meals, created] })
    },
  })
  const updateMealMutation = useMutation({
    mutationFn: ({ id, patch }) => api.updateMeal(id, patch),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(['bootstrap'], (prev) => prev && {
        ...prev,
        meals: prev.meals.map((m) => (m.id === id ? updated : m)),
      })
    },
  })
  const deleteMealMutation = useMutation({
    mutationFn: api.deleteMeal,
    onSuccess: (_, id) => {
      queryClient.setQueryData(['bootstrap'], (prev) => prev && {
        ...prev,
        meals: prev.meals.filter((m) => m.id !== id),
      })
    },
  })

  const actions = useMemo(
    () => ({
      addFood: (food) => addFoodMutation.mutateAsync(food),
      addFoods: (newFoods) => addFoodsMutation.mutateAsync(newFoods),
      updateFood: (id, patch) => updateFoodMutation.mutateAsync({ id, patch }),
      deleteFood: (id) => deleteFoodMutation.mutateAsync(id),
      addLogEntry: (entry) => addLogEntryMutation.mutateAsync(entry),
      updateLogEntry: (id, patch) => updateLogEntryMutation.mutateAsync({ id, patch }),
      removeLogEntry: (id) => removeLogEntryMutation.mutateAsync(id),
      copyDay: (fromISO, toISO) => copyDayMutation.mutateAsync({ fromISO, toISO }),
      importDayData: (payload) => importDayMutation.mutateAsync(payload),
      updateSettings: (patch) => updateSettingsMutation.mutateAsync(patch),
      setWaterForDate: (dateISO, ml) => setWaterMutation.mutateAsync({ date: dateISO, ml: Math.max(0, ml) }),
      addMealType: (meal) => addMealMutation.mutateAsync(meal),
      updateMealType: (id, patch) => updateMealMutation.mutateAsync({ id, patch }),
      deleteMealType: (id) => deleteMealMutation.mutateAsync(id),
      setSelectedDate,
    }),
    [
      addFoodMutation,
      addFoodsMutation,
      updateFoodMutation,
      deleteFoodMutation,
      addLogEntryMutation,
      updateLogEntryMutation,
      removeLogEntryMutation,
      copyDayMutation,
      importDayMutation,
      updateSettingsMutation,
      setWaterMutation,
      addMealMutation,
      updateMealMutation,
      deleteMealMutation,
      setSelectedDate,
    ],
  )

  const value = useMemo(
    () => ({
      authStatus,
      authError,
      login,
      logout,
      foods,
      logs,
      loggedDates,
      meals,
      settings,
      water: waterMl,
      selectedDate,
      ...actions,
    }),
    [authStatus, authError, login, logout, foods, logs, loggedDates, meals, settings, waterMl, selectedDate, actions],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
