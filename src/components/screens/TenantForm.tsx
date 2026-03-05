import { NavLink } from 'react-router-dom'
import type { Quota, User } from './tenantManagement'

type TenantFormProps = {
  heading: string
  description: string
  submitIdleLabel: string
  submitLoadingLabel: string
  userEmails: string
  selectedQuotaId: number
  quotas: Quota[]
  foundUsers: User[]
  error: string | null
  submitting: boolean
  onUserEmailsChange: (value: string) => void
  onQuotaChange: (quotaId: number) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export function TenantForm({
  heading,
  description,
  submitIdleLabel,
  submitLoadingLabel,
  userEmails,
  selectedQuotaId,
  quotas,
  foundUsers,
  error,
  submitting,
  onUserEmailsChange,
  onQuotaChange,
  onSubmit,
}: TenantFormProps) {
  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Tenant Management</p>
            <h2>{heading}</h2>
          </div>
          <NavLink to="/admin-panel" className="btn-secondary-pill">
            Cancel
          </NavLink>
        </header>

        <form className="panel-flat deploy-form" onSubmit={onSubmit}>
          <p className="project-line">
            Administrator Control Plane: <strong>{description}</strong>
          </p>

          <div className="form-grid">
            <label>
              User Email(s)
              <input
                type="text"
                value={userEmails}
                onChange={(event) => onUserEmailsChange(event.target.value)}
                placeholder="user1@company.com, user2@company.com"
                required
              />
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                Enter one or more email addresses separated by commas
              </small>
            </label>
          </div>

          {foundUsers.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#e6f7e6', borderRadius: '6px', border: '1px solid #a3d8a3' }}>
              <strong style={{ color: '#2e7d32' }}>✓ Users to be assigned:</strong>
              <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0 }}>
                {foundUsers.map((user) => (
                  <li key={user.id} style={{ padding: '4px 0', color: '#1e4620' }}>
                    • {user.name} ({user.email})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3>Select Quota</h3>
            <div className="choice-grid">
              {quotas.map((quota) => (
                <button
                  key={quota.id}
                  type="button"
                  className={`choice-card ${selectedQuotaId === quota.id ? 'active' : ''}`}
                  onClick={() => onQuotaChange(quota.id)}
                >
                  <strong>{quota.name.charAt(0).toUpperCase() + quota.name.slice(1)}</strong>
                  <span>
                    {quota.cpu_limit} vCPU • {quota.ram_limit / 1024}GB RAM • {quota.disk_limit}GB Storage
                  </span>
                  <small>Max Instances: {quota.vm_limit}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="deploy-footer">
            {error && <p className="guard-warning">{error}</p>}
            <button type="submit" className="btn-primary-pill" disabled={submitting}>
              {submitting ? submitLoadingLabel : submitIdleLabel}
            </button>
          </div>
        </form>
      </main>
    </section>
  )
}
