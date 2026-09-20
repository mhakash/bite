import { motion } from 'framer-motion'
import IconButton from './IconButton'
import './WaterTracker.css'

const STEP = 250

export default function WaterTracker({ ml, goalMl, onChange }) {
  const cups = Math.round(goalMl / STEP)
  const filled = Math.round(ml / STEP)
  const pct = Math.min(1, ml / goalMl)

  return (
    <div className="water-card">
      <div className="water-card__top">
        <div>
          <h3>Water</h3>
          <span className="water-card__sub mono">{ml} / {goalMl} ml</span>
        </div>
        <div className="water-card__buttons">
          <IconButton icon="minus" onClick={() => onChange(Math.max(0, ml - STEP))} aria-label="Remove water" />
          <IconButton icon="plus" onClick={() => onChange(ml + STEP)} aria-label="Add water" />
        </div>
      </div>
      <div className="water-cups">
        {Array.from({ length: cups }).map((_, i) => (
          <motion.button
            key={i}
            className="water-cup"
            onClick={() => onChange((i + 1) * STEP === ml ? i * STEP : (i + 1) * STEP)}
            initial={false}
            animate={{ opacity: 1 }}
          >
            <motion.span
              className="water-cup__fill"
              animate={{ height: i < filled ? '100%' : '0%' }}
              transition={{ duration: 0.4 }}
            />
          </motion.button>
        ))}
      </div>
      {pct >= 1 && <span className="water-card__done">Goal reached 💧</span>}
    </div>
  )
}
