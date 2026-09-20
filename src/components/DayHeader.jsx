import { motion, AnimatePresence } from 'framer-motion'
import { addDaysISO, formatDisplayDate, todayISO } from '../utils/date'
import './DayHeader.css'

export default function DayHeader({ date, onChange, onOpenSettings, streak }) {
  const isToday = date === todayISO()

  return (
    <header className="day-header">
      <div className="day-header__top">
        <div className="brand">
          <span className="brand__mark">🍊</span>
          <span className="brand__name">Bite</span>
        </div>
        <div className="day-header__actions">
          {streak > 1 && (
            <span className="streak-chip" title={`${streak} day streak`}>
              🔥 {streak}
            </span>
          )}
          <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            ⚙️
          </button>
        </div>
      </div>

      <div className="day-switcher">
        <button className="day-switcher__arrow" onClick={() => onChange(addDaysISO(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <div className="day-switcher__label-wrap">
          <AnimatePresence mode="wait">
            <motion.span
              key={date}
              className="day-switcher__label"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {formatDisplayDate(date)}
            </motion.span>
          </AnimatePresence>
        </div>
        <button
          className="day-switcher__arrow"
          onClick={() => onChange(addDaysISO(date, 1))}
          aria-label="Next day"
          disabled={isToday}
        >
          ›
        </button>
      </div>
    </header>
  )
}
