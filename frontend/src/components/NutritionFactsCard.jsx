import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MACRO_NUTRIENTS, MICRO_NUTRIENTS } from '../data/nutrients'
import { round } from '../utils/nutrition'
import './NutritionFactsCard.css'

function Row({ def, value }) {
  const pct = def.dv ? Math.min(999, (value / def.dv) * 100) : 0
  return (
    <div className="nf-row">
      <div className="nf-row__text">
        <span className="nf-row__label">{def.label}</span>
        <span className="nf-row__amount mono">
          {round(value, value < 10 ? 1 : 0)}
          {def.unit}
        </span>
      </div>
      <div className="nf-row__bar-track">
        <motion.div
          className="nf-row__bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="nf-row__pct mono">{round(pct)}%</span>
    </div>
  )
}

export default function NutritionFactsCard({ totals }) {
  const [tab, setTab] = useState('macro')

  const defs = tab === 'macro' ? MACRO_NUTRIENTS : MICRO_NUTRIENTS

  return (
    <div className="nf-card">
      <div className="nf-card__title-row">
        <h3>Nutrition Facts</h3>
        <span className="nf-card__caption">today, per label</span>
      </div>
      <div className="nf-card__rule nf-card__rule--thick" />

      <div className="nf-tabs">
        <button className={`nf-tab ${tab === 'macro' ? 'nf-tab--active' : ''}`} onClick={() => setTab('macro')}>
          Macros
        </button>
        <button className={`nf-tab ${tab === 'micro' ? 'nf-tab--active' : ''}`} onClick={() => setTab('micro')}>
          Vitamins & minerals
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {defs.map((def) => (
            <Row key={def.key} def={def} value={totals[def.key] || 0} />
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="nf-card__rule" />
      <p className="nf-card__footnote">% Daily Value based on a 2,000 calorie reference diet.</p>
    </div>
  )
}
