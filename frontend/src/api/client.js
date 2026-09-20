// Thin fetch wrapper around the Go backend, which is a separate deployment
// (e.g. this frontend on Vercel, the API on its own domain) — every request
// is cross-origin, so API_BASE is required and cookies rely on CORS +
// SameSite=None on the backend. The access token itself lives only in
// memory (never localStorage): on load, and whenever it expires, we ask
// /api/auth/refresh to mint a new one from the httpOnly refresh cookie.
const API_BASE = import.meta.env.VITE_API_URL || ''

let accessToken = null

function setAccessToken(token) {
  accessToken = token
}

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && retry && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    try {
      await refresh()
    } catch {
      throw new ApiError('Session expired', 401)
    }
    return request(path, { method, body, retry: false })
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}

export async function login(username, password) {
  const data = await request('/api/auth/login', { method: 'POST', body: { username, password }, retry: false })
  setAccessToken(data.accessToken)
  return data
}

export async function refresh() {
  const data = await request('/api/auth/refresh', { method: 'POST', retry: false })
  setAccessToken(data.accessToken)
  return data
}

export async function logout() {
  try {
    await request('/api/auth/logout', { method: 'POST', retry: false })
  } finally {
    setAccessToken(null)
  }
}

export const getBootstrap = () => request('/api/bootstrap')

export const getLogsForDate = (date) => request(`/api/logs?date=${date}`)
export const getLogsForRange = (start, end) => request(`/api/logs?start=${start}&end=${end}`)
export const getLoggedDates = () => request('/api/logs/dates')

export const getWater = (date) => request(`/api/water/${date}`)

export const createFood = (food) => request('/api/foods', { method: 'POST', body: food })
export const bulkCreateFoods = (foods) => request('/api/foods/bulk', { method: 'POST', body: { foods } })
export const updateFood = (id, patch) => request(`/api/foods/${id}`, { method: 'PATCH', body: patch })
export const deleteFood = (id) => request(`/api/foods/${id}`, { method: 'DELETE' })

export const createMeal = (meal) => request('/api/meals', { method: 'POST', body: meal })
export const updateMeal = (id, patch) => request(`/api/meals/${id}`, { method: 'PATCH', body: patch })
export const deleteMeal = (id) => request(`/api/meals/${id}`, { method: 'DELETE' })

export const createLog = (entry) => request('/api/logs', { method: 'POST', body: entry })
export const updateLog = (id, patch) => request(`/api/logs/${id}`, { method: 'PATCH', body: patch })
export const deleteLog = (id) => request(`/api/logs/${id}`, { method: 'DELETE' })
export const copyDay = (fromDate, toDate) => request('/api/logs/copy', { method: 'POST', body: { fromDate, toDate } })

export const setWater = (date, ml) => request(`/api/water/${date}`, { method: 'PUT', body: { ml } })

export const updateSettings = (patch) => request('/api/settings', { method: 'PATCH', body: patch })

export const importDay = (payload) => request('/api/days/import', { method: 'POST', body: payload })

export { ApiError }
