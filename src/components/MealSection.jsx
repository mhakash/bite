import { AnimatePresence, motion } from 'framer-motion'
import { round, nutrientsForEntry, gramsForEntry } from '../utils/nutrition'
import IconButton from './IconButton'
import MealIcon from './MealIcon'
import './MealSection.css'

export default function MealSection({ meal, entries, foods, onAdd, onRemove }) {
  const items = entries
    .map((e) => ({ entry: e, food: foods.find((f) => f.id === e.foodId) }))
    .filter((x) => x.food)

  const mealCalories = items.reduce((sum, { entry, food }) => sum + nutrientsForEntry(food, entry).calories, 0)

  return (
    <section className="meal-section">
      <div className="meal-section__header">
        <div className="meal-section__title">
          <MealIcon icon={meal.icon} />
          <h3>{meal.label}</h3>
        </div>
        <div className="meal-section__right">
          {mealCalories > 0 && <span className="meal-section__cals mono">{round(mealCalories)} kcal</span>}
          <IconButton icon="plus" size={26} onClick={() => onAdd(meal.id)} aria-label={`Add to ${meal.label}`} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {items.length === 0 && (
          <motion.p
            className="meal-section__empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Nothing logged yet
          </motion.p>
        )}
        {items.map(({ entry, food }) => {
          const n = nutrientsForEntry(food, entry)
          const grams = gramsForEntry(food, entry)
          const portion = food.portions.find((p) => p.id === entry.portionId)
          return (
            <motion.div
              key={entry.id}
              className="food-row"
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="food-row__dot" style={{ background: `var(--${food.color || 'mango'})` }} />
              <div className="food-row__info">
                <span className="food-row__name">{food.name}</span>
                <span className="food-row__portion">
                  {!entry.customGrams && entry.quantity && entry.quantity !== 1 ? `${round(entry.quantity, 2)} × ` : ''}
                  {portion?.label || `${round(grams)}g`}
                </span>
              </div>
              <span className="food-row__cals mono">{round(n.calories)}</span>
              <button className="food-row__remove" onClick={() => onRemove(entry.id)} aria-label={`Remove ${food.name}`}>
                ×
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </section>
  )
}
