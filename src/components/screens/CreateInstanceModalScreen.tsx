import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'

type Tenant = {
  id: number
  is_active: boolean
  quota_id: number
  Quotum: {
    id: number
    name: string
    cpu_limit: number
    ram_limit: number
    disk_limit: string
    vm_limit: number
  }
  total_cpu: number
  total_ram: number
  total_disk: number
  total_vms: number
}

type Image = {
  id: string
  name: string
  dockerImage: string // Соответствие образу в базе
  cpu: number
  ramGb: number
  storageGb: number
}

export function CreateInstanceModalScreen() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)

  const [images] = useState<Image[]>([
    { id: 'img-1', name: 'Nginx Static', dockerImage: 'flashspys/nginx-static', cpu: 1, ramGb: 1, storageGb: 10 },
    { id: 'img-2', name: 'Lighttpd', dockerImage: 'polygnome/lighttpd', cpu: 1, ramGb: 1, storageGb: 10 },
    { id: 'img-3', name: 'Nginx Alpine', dockerImage: 'nginx:alpine', cpu: 1, ramGb: 1, storageGb: 10 },
    { id: 'img-4', name: 'Apache Alpine', dockerImage: 'httpd:alpine', cpu: 2, ramGb: 2, storageGb: 20 },
    { id: 'img-5', name: 'Caddy Alpine', dockerImage: 'caddy:alpine', cpu: 1, ramGb: 1, storageGb: 10 },
  ])

  const [instanceName, setInstanceName] = useState('')
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем тенанты пользователя
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true)
        const token = Cookies.get('token')
        
        const response = await fetch('http://localhost:3000/tenants/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })

        if (response.status === 404) {
          // У пользователя нет тенанта
          setTenants([])
          return
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tenant: ${response.status}`)
        }

        const data = await response.json()
        console.log('Fetched my tenant:', data)
        setTenants([data]) // Оборачиваем в массив для совместимости с select
        setSelectedTenantId(data.id)
        
      } catch (error) {
        console.error('Error fetching tenant:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTenants()
  }, [])

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? images[0],
    [images, selectedImageId],
  )

  const selectedTenant = useMemo(
    () => tenants.find(t => t.id === selectedTenantId),
    [tenants, selectedTenantId]
  )

  // Функция проверки возможности развертывания
  const canDeployForTenant = (tenantId: number, imageId: string) => {
    const tenant = tenants.find(t => t.id === tenantId)
    const image = images.find((item) => item.id === imageId)
    
    if (!tenant || !image) {
      return { ok: false, reason: 'Invalid tenant or image selection.' }
    }

    const currentUsage = {
      vcpu: tenant.total_cpu || 0,
      ram: tenant.total_ram || 0,
      disk: tenant.total_disk || 0,
      instances: tenant.total_vms || 0
    }

    const projected = {
      vcpu: currentUsage.vcpu + image.cpu,
      ram: currentUsage.ram + (image.ramGb * 1024), // GB to MB
      disk: currentUsage.disk + image.storageGb,
      instances: currentUsage.instances + 1
    }

    if (projected.vcpu > tenant.Quotum.cpu_limit) {
      return { ok: false, reason: 'CPU quota would be exceeded.' }
    }

    if (projected.ram > tenant.Quotum.ram_limit) {
      return { ok: false, reason: 'RAM quota would be exceeded.' }
    }

    if (projected.disk > Number(tenant.Quotum.disk_limit)) {
      return { ok: false, reason: 'Storage quota would be exceeded.' }
    }

    if (projected.instances > tenant.Quotum.vm_limit) {
      return { ok: false, reason: 'Instance limit would be exceeded.' }
    }

    return { ok: true, reason: null }
  }

  // Функция создания VM
  const createVm = async (payload: {
    tenantId: number
    name: string
    imageId: string
  }) => {
    const token = Cookies.get('token')
    const image = images.find(i => i.id === payload.imageId)

    if (!image) {
      throw new Error('Invalid image selection')
    }

    const response = await fetch('http://localhost:3000/vms', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        image: image.dockerImage,
        cpu: image.cpu,
        ram: image.ramGb * 1024, // Convert GB to MB
        disk: image.storageGb,
        tenant_id: payload.tenantId,
        status: 'creating'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create VM')
    }

    return await response.json()
  }

  if (loading) {
    return (
      <section className="mts-page">
        <main className="mts-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </main>
      </section>
    )
  }

  if (!selectedTenant) {
    return (
      <section className="mts-page">
        <main className="mts-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>No Tenant Available</h2>
            <p>You don't have a tenant to create instances in.</p>
            <NavLink to="/customer-dashboard" className="btn-primary-pill">
              Go Back
            </NavLink>
          </div>
        </main>
      </section>
    )
  }

  const guard = canDeployForTenant(selectedTenantId as number, selectedImageId)
  const deployBlocked = !guard.ok || !instanceName.trim() || submitting

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (deployBlocked || !selectedImage || !selectedTenantId) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createVm({
        tenantId: selectedTenantId as number,
        name: instanceName.trim(),
        imageId: selectedImage.id,
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
          <div className="form-grid two">
            <label>
              Tenant
              <select 
                value={selectedTenantId} 
                onChange={(event) => setSelectedTenantId(Number(event.target.value))}
                disabled={tenants.length <= 1}
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.Quotum.name} (Tenant #{tenant.id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Instance Name
              <input
                type="text"
                value={instanceName}
                onChange={(event) => setInstanceName(event.target.value)}
                placeholder="mts-edge-api-01"
                required
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
                  <strong>{image.name}</strong>
                  <span>
                    {image.cpu} vCPU • {image.ramGb}GB RAM • {image.storageGb}GB Storage
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="deploy-footer">
            <p>
              Quota for {selectedTenant.Quotum.name}: {selectedTenant.Quotum.cpu_limit} vCPU, 
              {Number(selectedTenant.Quotum.ram_limit) / 1024}GB RAM, {Number(selectedTenant.Quotum.disk_limit)}GB Storage
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
