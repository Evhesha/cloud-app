import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type AuthMode = 'login' | 'register'

export function AuthScreen() {
  const navigate = useNavigate()
  const { user, login, register } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin-panel' : '/customer-dashboard'} replace />
  }

  const clearFeedback = () => {
    setError(null)
    setSuccess(null)
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    clearFeedback()
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()

    if (!email || !password || (mode === 'register' && !name)) {
      setError('Fill in all required fields.')
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const loggedUser = await login({ email, password })
        navigate(loggedUser.role === 'admin' ? '/admin-panel' : '/customer-dashboard')
      } else {
        await register({ name, email, password })
        setSuccess('Registration completed. You can sign in now.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card-mts">
        <div className="auth-header">
          <span className="mts-kicker">MTS CLOUD</span>
          <h2>{mode === 'login' ? 'Sign In' : 'Register'}</h2>
          <p>{mode === 'login' ? 'Access your cloud infrastructure.' : 'Create a new account.'}</p>
        </div>

        <div className="mode-toggle" role="tablist" aria-label="Auth mode">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            Sign In
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>
            Register
          </button>
        </div>

        <form className="auth-form-mts" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Full Name
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="John Doe" />
            </label>
          )}

          <label>
            Work Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </label>

          {mode === 'register' && (
            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
              />
            </label>
          )}

          {error && <p className="guard-warning">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <button type="submit" className="btn-primary-pill" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Continue' : 'Create Account'}
          </button>
        </form>
      </div>
    </section>
  )
}
