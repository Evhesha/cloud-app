import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'

type Quota = {
  id: number
  name: string
  cpu_limit: number
  ram_limit: number
  disk_limit: string
  vm_limit: number
}

export function CreateTenantModalScreen() {
  const navigate = useNavigate()
  const [quotas] = useState<Quota[]>([
    { id: 1, name: 'basic', cpu_limit: 2, ram_limit: 4096, disk_limit: '50', vm_limit: 2 },
    { id: 2, name: 'intermediate', cpu_limit: 4, ram_limit: 8192, disk_limit: '100', vm_limit: 5 },
    { id: 3, name: 'professional', cpu_limit: 8, ram_limit: 16384, disk_limit: '200', vm_limit: 10 }
  ])

  const [ownerEmail, setOwnerEmail] = useState('')
  const [selectedQuotaId, setSelectedQuotaId] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!ownerEmail.trim()) {
      setError('Owner Email is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const token = Cookies.get('token')
      
      const response = await fetch('http://localhost:3000/tenants', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quota_id: selectedQuotaId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tenant')
      }

      const data = await response.json()
      console.log('Tenant created:', data)
      
      navigate('/admin-panel')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create tenant.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Tenant Management</p>
            <h2>MTS Cloud Tenant Onboarding</h2>
          </div>
          <NavLink to="/admin-panel" className="btn-secondary-pill">
            Cancel
          </NavLink>
        </header>

        <form className="panel-flat deploy-form" onSubmit={submit}>
          <p className="project-line">
            Administrator Control Plane: <strong>New Isolated Tenant Space</strong>
          </p>

          <div className="form-grid">
            <label>
              Owner Email
              <input
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="owner@company.com"
                required
              />
            </label>
          </div>

          <div>
            <h3>Select Quota</h3>
            <div className="choice-grid">
              {quotas.map((quota) => (
                <button
                  key={quota.id}
                  type="button"
                  className={`choice-card ${selectedQuotaId === quota.id ? 'active' : ''}`}
                  onClick={() => setSelectedQuotaId(quota.id)}
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
              {submitting ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </main>
    </section>
  )
}