import { useState } from 'react'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <section className="auth-screen">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-mark" />
          <strong>CloudPlatform IaaS</strong>
        </div>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          <h1>
            {mode === 'login'
              ? 'Sign in to your Cloud Account'
              : 'Create Tenant Account'}
          </h1>

          <p>
            {mode === 'login'
              ? 'Access your virtual infrastructure'
              : 'Start managing your cloud resources'}
          </p>

          <div className="switch-row">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form className="auth-form">
            

            <label>
              Email Address
              <input type="email" placeholder="name@company.com" required />
            </label>

            <label>
              Password
              <input type="password" placeholder="••••••••" required />
            </label>

            {mode === 'register' && (
              <div>
              <label>
                Confirm Password
                <input type="password" placeholder="••••••••" required />
              </label>
              <label>
              Name
              <input type="text" placeholder="John Doe" required />
            </label>
              </div>
            )}

            <button type="submit" className="primary-btn">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <>
            
              <p className="auth-footer-note">
                Don’t have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setMode('register')}
                >
                  Register
                </button>
              </p>
            </>
          )}

          {mode === 'register' && (
            <p className="auth-footer-note">
              Already have an account?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => setMode('login')}
              >
                Sign In
              </button>
              
            </p>
            
          )}
        </div>
      </div>
    </section>
  )
}