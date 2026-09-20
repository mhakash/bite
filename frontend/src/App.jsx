import { useMemo, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Login from './components/Login'
import DayHeader from './components/DayHeader'
import CalorieHero from './components/CalorieHero'
import MealSection from './components/MealSection'
import AddEntrySheet from './components/AddEntrySheet'
import FoodForm from './components/FoodForm'
import NutritionFactsCard from './components/NutritionFactsCard'
import WaterTracker from './components/WaterTracker'
import WeeklyTrend from './components/WeeklyTrend'
import SettingsSheet from './components/SettingsSheet'
import { addDaysISO, todayISO } from './utils/date'
import { nutrientsForEntry, sumNutrients } from './utils/nutrition'
import { buildDayExport, buildFoodLibraryExport, downloadJson, parseDayImport, readFileAsText } from './utils/exportImport'
import { parseFoodJson } from './utils/foodJson'
import './App.css'

function computeStreak(logs, fromISO) {
  const datesWithEntries = new Set(logs.map((e) => e.date))
  let streak = 0
  let cursor = fromISO
  while (datesWithEntries.has(cursor)) {
    streak += 1
    cursor = addDaysISO(cursor, -1)
  }
  return streak
}

function TrackerScreen() {
  const {
    foods, logs, meals, settings, water, selectedDate,
    addLogEntry, removeLogEntry, addFood, addFoods, updateSettings, setWaterForDate, setSelectedDate, copyDay,
    importDayData, addMealType, updateMealType, deleteMealType, logout,
  } = useApp()

  const [addSheetMeal, setAddSheetMeal] = useState(null)
  const [foodFormOpen, setFoodFormOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingMealForNewFood, setPendingMealForNewFood] = useState(null)
  const [dataNotice, setDataNotice] = useState('')

  const dayEntries = useMemo(() => logs.filter((e) => e.date === selectedDate), [logs, selectedDate])

  const totals = useMemo(() => {
    const nutrientList = dayEntries
      .map((e) => {
        const food = foods.find((f) => f.id === e.foodId)
        return food ? nutrientsForEntry(food, e) : null
      })
      .filter(Boolean)
    return sumNutrients(nutrientList)
  }, [dayEntries, foods])

  const recentFoodIds = useMemo(() => {
    const seen = []
    for (let i = logs.length - 1; i >= 0; i--) {
      if (!seen.includes(logs[i].foodId)) seen.push(logs[i].foodId)
      if (seen.length >= 8) break
    }
    return seen
  }, [logs])

  const streak = useMemo(() => computeStreak(logs, todayISO()), [logs])
  const yesterdayEntries = useMemo(
    () => logs.filter((e) => e.date === addDaysISO(selectedDate, -1)),
    [logs, selectedDate],
  )

  function openAddSheet(mealId) {
    setAddSheetMeal(mealId)
  }

  async function handleLog(payload) {
    await addLogEntry({ ...payload, date: selectedDate })
    setAddSheetMeal(null)
  }

  function handleCreateNewFood() {
    setPendingMealForNewFood(addSheetMeal)
    setAddSheetMeal(null)
    setFoodFormOpen(true)
  }

  async function handleSaveFood(foodData) {
    const created = await addFood(foodData)
    setFoodFormOpen(false)
    if (pendingMealForNewFood) {
      await addLogEntry({
        foodId: created.id,
        portionId: created.defaultPortionId,
        quantity: 1,
        meal: pendingMealForNewFood,
        date: selectedDate,
      })
      setPendingMealForNewFood(null)
    }
  }

  async function handleImportMany(foodsData) {
    await addFoods(foodsData)
    setPendingMealForNewFood(null)
  }

  function handleExportDay() {
    const data = buildDayExport(selectedDate, dayEntries, foods, water[selectedDate])
    downloadJson(`bite-day-${selectedDate}.json`, data)
  }

  async function handleImportDayFile(file) {
    try {
      const text = await readFileAsText(file)
      const parsed = parseDayImport(text)
      const result = await importDayData(parsed)
      setDataNotice(`Imported ${result.addedEntries} entr${result.addedEntries === 1 ? 'y' : 'ies'} for ${parsed.date}${result.addedFoods ? ` (+${result.addedFoods} new food${result.addedFoods === 1 ? '' : 's'})` : ''}.`)
    } catch (err) {
      setDataNotice(err.message)
    }
  }

  function handleExportFoods() {
    downloadJson('bite-foods.json', buildFoodLibraryExport(foods))
  }

  async function handleImportFoodsFile(file) {
    try {
      const text = await readFileAsText(file)
      const parsedFoods = parseFoodJson(text)
      const result = await addFoods(parsedFoods)
      setDataNotice(`Added ${result.added} food${result.added === 1 ? '' : 's'}${result.skipped ? `, skipped ${result.skipped} already in your library` : ''}.`)
    } catch (err) {
      setDataNotice(err.message)
    }
  }

  return (
    <div className="app-shell">
      <DayHeader
        date={selectedDate}
        onChange={setSelectedDate}
        onOpenSettings={() => setSettingsOpen(true)}
        streak={streak}
      />

      <CalorieHero totals={totals} goals={settings} />

      {dayEntries.length === 0 && yesterdayEntries.length > 0 && (
        <button className="copy-day-cta" onClick={() => copyDay(addDaysISO(selectedDate, -1), selectedDate)}>
          ↻ Copy yesterday's log to this day
        </button>
      )}

      <div className="meal-list">
        {meals.map((meal) => (
          <MealSection
            key={meal.id}
            meal={meal}
            entries={dayEntries.filter((e) => e.meal === meal.id)}
            foods={foods}
            onAdd={openAddSheet}
            onRemove={removeLogEntry}
          />
        ))}
      </div>

      <WaterTracker
        ml={water[selectedDate] || 0}
        goalMl={settings.waterGoalMl}
        onChange={(ml) => setWaterForDate(selectedDate, ml)}
      />

      <NutritionFactsCard totals={totals} />

      <WeeklyTrend
        logs={logs}
        foods={foods}
        calorieGoal={settings.calorieGoal}
        endISO={selectedDate}
        nutrientsForEntry={nutrientsForEntry}
      />

      <div className="app-footer-space" />

      <AddEntrySheet
        open={!!addSheetMeal}
        meal={addSheetMeal}
        foods={foods}
        recentFoodIds={recentFoodIds}
        onClose={() => setAddSheetMeal(null)}
        onLog={handleLog}
        onCreateNew={handleCreateNewFood}
      />

      <FoodForm
        open={foodFormOpen}
        onClose={() => {
          setFoodFormOpen(false)
          setPendingMealForNewFood(null)
        }}
        onSave={handleSaveFood}
        onImportMany={handleImportMany}
      />

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        selectedDate={selectedDate}
        dayEntryCount={dayEntries.length}
        foodCount={foods.length}
        notice={dataNotice}
        meals={meals}
        onAddMeal={addMealType}
        onUpdateMeal={updateMealType}
        onDeleteMeal={deleteMealType}
        onDismissNotice={() => setDataNotice('')}
        onClose={() => {
          setSettingsOpen(false)
          setDataNotice('')
        }}
        onSave={updateSettings}
        onExportDay={handleExportDay}
        onImportDayFile={handleImportDayFile}
        onExportFoods={handleExportFoods}
        onImportFoodsFile={handleImportFoodsFile}
        onLogout={logout}
      />
    </div>
  )
}

function AuthGate() {
  const { authStatus } = useApp()

  if (authStatus === 'checking') {
    return <div className="app-loading">Loading…</div>
  }
  if (authStatus === 'anon') {
    return <Login />
  }
  return <TrackerScreen />
}

export default function App() {
  return (
    <AppProvider>
      <AuthGate />
    </AppProvider>
  )
}
