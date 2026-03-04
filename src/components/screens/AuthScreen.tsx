export function AuthScreen() {
  return (
    <section className="auth-screen">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-mark" />
          <strong>CloudPlatform</strong>
        </div>
        <nav>
          <a href="#">Solutions</a>
          <a href="#">Pricing</a>
          <a href="#">Documentation</a>
          <button type="button">Support</button>
        </nav>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p>Enterprise-grade infrastructure management</p>

          <div className="switch-row" role="tablist" aria-label="Role switch">
            <button type="button" className="active">
              Customer
            </button>
            <button type="button">Admin</button>
          </div>

          <form className="auth-form">
            <label>
              Email Address
              <input type="email" placeholder="name@company.com" />
            </label>
            <label>
              Password
              <input type="password" placeholder="••••••••" />
            </label>
            <button type="submit" className="primary-btn">
              Sign In to Dashboard
            </button>
          </form>

          <button type="button" className="ghost-btn">
            Continue with SSO
          </button>
        </div>

        <footer className="auth-footer">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
        </footer>
      </div>
    </section>
  )
}
