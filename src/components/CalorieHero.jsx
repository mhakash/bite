import { motion } from 'framer-motion'
import ProgressRing from './ProgressRing'
import { round } from '../utils/nutrition'
import './CalorieHero.css'

const MACROS = [
  { key: 'protein', label: 'Protein', color: 'var(--accent-protein)' },
  { key: 'carbs', label: 'Carbs', color: 'var(--accent-carbs)' },
  { key: 'fat', label: 'Fat', color: 'var(--accent-fat)' },
]

export default function CalorieHero({ totals, goals }) {
  const consumed = totals.calories || 0
  const goal = goals.calorieGoal || 1
  const remaining = Math.max(0, goal - consumed)
  const progress = consumed / goal
  const over = consumed > goal

  return (
    <div className="calorie-hero">
      <ProgressRing
        size={216}
        stroke={16}
        progress={progress}
        gradientId="calorieGradient"
        colors={over ? ['#ff5c8a', '#ff3d68'] : ['#ffb648', '#ff8a3d']}
      >
        <div className="calorie-hero__center">
          <motion.span
            key={round(remaining)}
            className="calorie-hero__value mono"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {round(Math.abs(remaining))}
          </motion.span>
          <span className="calorie-hero__unit">{over ? 'kcal over' : 'kcal left'}</span>
          <span className="calorie-hero__sub mono">{round(consumed)} / {round(goal)}</span>
        </div>
      </ProgressRing>

      <div className="macro-bars">
        {MACROS.map((m) => {
          const consumedVal = totals[m.key] || 0
          const goalVal = goals[`${m.key}Goal`] || 1
          const pct = Math.min(1, consumedVal / goalVal)
          return (
            <div className="macro-bar" key={m.key}>
              <div className="macro-bar__top">
                <span className="macro-bar__label">{m.label}</span>
                <span className="macro-bar__value mono">
                  {round(consumedVal)}<span className="macro-bar__goal">/{round(goalVal)}g</span>
                </span>
              </div>
              <div className="macro-bar__track">
                <motion.div
                  className="macro-bar__fill"
                  style={{ background: m.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
