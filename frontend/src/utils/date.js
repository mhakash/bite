export function toISODate(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDaysISO(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return toISODate(date)
}

export function formatDisplayDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = todayISO()
  const yesterday = addDaysISO(today, -1)
  const tomorrow = addDaysISO(today, 1)
  if (iso === today) return 'Today'
  if (iso === yesterday) return 'Yesterday'
  if (iso === tomorrow) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatFullDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function lastNDaysISO(n, endISO = todayISO()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(addDaysISO(endISO, -i))
  return out
}
