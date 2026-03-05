import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { useCloud } from '../../context/CloudContext'
import type { CreateTenantPayload } from '../../types/cloud'

export function CreateTenantModalScreen() {
  const navigate = useNavigate()
  const { tenantId } = useParams<{ tenantId: string }>()
  const { tenants, createTenant, updateTenant } = useCloud()

  const editingTenant = useMemo(() => tenants.find((tenant) => tenant.id === tenantId) ?? null, [tenantId, tenants])
  const isEditMode = Boolean(editingTenant)

  const [tenantName, setTenantName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [segment, setSegment] = useState<CreateTenantPayload['segment']>('startup')
  const [vcpu, setVcpu] = useState(8)
  const [ramGb, setRamGb] = useState(24)
  const [storageGb, setStorageGb] = useState(500)
  const [instances, setInstances] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editingTenant) {
      return
    }

    setTenantName(editingTenant.name)
    setOwnerEmail(editingTenant.ownerEmail)
    setSegment(editingTenant.segment === 'startup' ? 'startup' : 'corporate')
    setVcpu(editingTenant.quota.vcpu)
    setRamGb(editingTenant.quota.ramGb)
    setStorageGb(editingTenant.quota.storageGb)
    setInstances(editingTenant.quota.instances)
  }, [editingTenant])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!tenantName.trim() || !ownerEmail.trim()) {
      setError('Tenant Name and Owner Email are required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const quota = {
        vcpu: Math.max(1, Number(vcpu)),
        ramGb: Math.max(1, Number(ramGb)),
        storageGb: Math.max(10, Number(storageGb)),
        instances: Math.max(1, Number(instances)),
      }

      if (isEditMode && editingTenant) {
        await updateTenant({
          id: editingTenant.id,
          name: tenantName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          quota,
        })
      } else {
        await createTenant({
          name: tenantName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          segment,
          quota,
        })
      }

      navigate('/admin-panel')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to save tenant.')
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
            <h2>{isEditMode ? 'Edit Tenant Configuration' : 'MTS Cloud Tenant Onboarding'}</h2>
          </div>
          <NavLink to="/admin-panel" className="btn-secondary-pill">
            Cancel
          </NavLink>
        </header>

        <form className="panel-flat deploy-form" onSubmit={submit}>
          <p className="project-line">
            Administrator Control Plane: <strong>{isEditMode ? 'Update Tenant Settings' : 'New Isolated Tenant Space'}</strong>
          </p>

          <div className="form-grid two">
            <label>
              Tenant Name
              <input
                type="text"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                placeholder="Aurora Systems"
              />
            </label>

            <label>
              Owner Email
              <input
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="owner@aurora.io"
              />
            </label>
          </div>

          {!isEditMode && (
            <div className="form-grid two">
              <label>
                Segment
                <select value={segment} onChange={(event) => setSegment(event.target.value as CreateTenantPayload['segment'])}>
                  <option value="startup">Startup</option>
                  <option value="corporate">Corporate</option>
                </select>
              </label>
            </div>
          )}

          <div>
            <h3>Quota Configuration</h3>
            <div className="form-grid two">
              <label>
                vCPU
                <input type="number" min={1} value={vcpu} onChange={(event) => setVcpu(Number(event.target.value))} />
              </label>

              <label>
                RAM (GB)
                <input type="number" min={1} value={ramGb} onChange={(event) => setRamGb(Number(event.target.value))} />
              </label>

              <label>
                Storage (GB)
                <input
                  type="number"
                  min={10}
                  value={storageGb}
                  onChange={(event) => setStorageGb(Number(event.target.value))}
                />
              </label>

              <label>
                Max Instances
                <input
                  type="number"
                  min={1}
                  value={instances}
                  onChange={(event) => setInstances(Number(event.target.value))}
                />
              </label>
            </div>
          </div>

          <div className="deploy-footer">
            {error && <p className="guard-warning">{error}</p>}
            <button type="submit" className="btn-primary-pill" disabled={submitting}>
              {submitting ? 'Saving...' : isEditMode ? 'Update Tenant' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </main>
    </section>
  )
}
