import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { lastNDaysISO } from '../utils/date'
import { round } from '../utils/nutrition'
import './WeeklyTrend.css'

export default function WeeklyTrend({ logs, foods, calorieGoal, endISO, nutrientsForEntry }) {
  const days = lastNDaysISO(7, endISO)
  const data = days.map((iso) => {
    const dayEntries = logs.filter((e) => e.date === iso)
    const calories = dayEntries.reduce((sum, e) => {
      const food = foods.find((f) => f.id === e.foodId)
      return food ? sum + nutrientsForEntry(food, e).calories : sum
    }, 0)
    const [, m, d] = iso.split('-')
    return { iso, label: `${m}/${d}`, calories: round(calories) }
  })

  return (
    <div className="trend-card">
      <div className="trend-card__top">
        <h3>This week</h3>
        <span className="trend-card__caption mono">goal {calorieGoal} kcal</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--mango)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--mango)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted-2)', fontSize: 11 }}
          />
          <ReferenceLine y={calorieGoal} stroke="var(--muted-2)" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline-strong)',
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--cream)' }}
          />
          <Area
            type="monotone"
            dataKey="calories"
            stroke="var(--mango)"
            strokeWidth={2.5}
            fill="url(#trendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
