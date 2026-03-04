import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCloud } from '../../context/CloudContext'
import { useAuth } from '../../context/AuthContext'
import { tenantByUserEmail } from '../../data/mockCloud'

export function CreateInstanceModalScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    tenants,
    flavors,
    images,
    canDeployForTenant,
    createVm,
  } = useCloud()

  const activeTenant = useMemo(() => {
    const emailKey = user?.email?.toLowerCase() ?? ''
    const mappedTenantId = tenantByUserEmail[emailKey]
    const byEmail = tenants.find((tenant) => tenant.id === mappedTenantId)
    if (byEmail) {
      return byEmail
    }

    const numericId = typeof user?.id === 'number' ? user.id : Number(user?.id)
    if (Number.isFinite(numericId) && tenants.length > 0) {
      return tenants[(Math.max(1, numericId) - 1) % tenants.length]
    }

    return tenants[0]
  }, [tenants, user?.email, user?.id])

  const activeTenantId = activeTenant.id

  const [instanceName, setInstanceName] = useState('')
  const [selectedFlavorId, setSelectedFlavorId] = useState(flavors[0]?.id ?? '')
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => flavor.id === selectedFlavorId) ?? flavors[0],
    [flavors, selectedFlavorId],
  )

  const guard = canDeployForTenant(activeTenantId, selectedFlavorId)
  const deployBlocked = !guard.ok || !instanceName.trim() || submitting

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (deployBlocked || !selectedFlavor || !selectedImageId) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createVm({
        tenantId: activeTenantId,
        name: instanceName.trim(),
        flavorId: selectedFlavor.id,
        imageId: selectedImageId,
      })

      navigate('/customer-dashboard')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to deploy instance.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Create Instance</p>
            <h2>Provision New Virtual Machine</h2>
          </div>
          <NavLink to="/customer-dashboard" className="btn-secondary-pill">
            Cancel
          </NavLink>
        </header>

        <form className="panel-flat deploy-form" onSubmit={submit}>
          <p className="project-line">
            Deploying to Project: <strong>{activeTenant.name}</strong>
          </p>

          <div className="form-grid">
            <label>
              Instance Name
              <input
                type="text"
                value={instanceName}
                onChange={(event) => setInstanceName(event.target.value)}
                placeholder="mts-edge-api-01"
              />
            </label>
          </div>

          <div>
            <h3>Select Image</h3>
            <div className="choice-grid">
              {images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  className={`choice-card ${selectedImageId === image.id ? 'active' : ''}`}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  {image.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3>Select Flavor</h3>
            <div className="choice-grid">
              {flavors.map((flavor) => (
                <button
                  key={flavor.id}
                  type="button"
                  className={`choice-card ${selectedFlavorId === flavor.id ? 'active' : ''}`}
                  onClick={() => setSelectedFlavorId(flavor.id)}
                >
                  <strong>{flavor.name}</strong>
                  <span>
                    {flavor.vcpu} vCPU • {flavor.ramGb}GB RAM • {flavor.storageGb}GB SSD
                  </span>
                  <small>${flavor.monthlyPrice}/mo</small>
                </button>
              ))}
            </div>
          </div>

          <div className="deploy-footer">
            <p>
              Quota for {activeTenant.name}: {activeTenant.quota.vcpu} vCPU, {activeTenant.quota.ramGb}GB RAM
            </p>
            {guard.reason && <p className="guard-warning">{guard.reason}</p>}
            {error && <p className="guard-warning">{error}</p>}
            <button type="submit" className="btn-primary-pill" disabled={deployBlocked}>
              {submitting ? 'Deploying...' : 'Deploy Instance'}
            </button>
          </div>
        </form>
      </main>
    </section>
  )
}
