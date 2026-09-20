import { useState } from 'react'
import { useApp } from '../context/AppContext'
import './Login.css'

export default function Login() {
  const { login, authError } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password || submitting) return
    setSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch {
      // authError is surfaced from context; nothing else to do here
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">🍊 Bite</h1>
        <p className="login-subtitle">Sign in to your account</p>

        <label className="login-field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </label>

        <label className="login-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {authError && <p className="login-error">{authError}</p>}

        <button className="login-submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
