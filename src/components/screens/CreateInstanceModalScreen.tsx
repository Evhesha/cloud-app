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

type Flavor = {
  id: string
  name: string
  vcpu: number
  ramGb: number
  storageGb: number
  monthlyPrice: number
  image: string // Соответствие образу
}

type Image = {
  id: string
  name: string
  dockerImage: string // Соответствие образу в базе
}

export function CreateInstanceModalScreen() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)

  // Моковые данные для flavors и images (можно заменить на API)
  const [flavors] = useState<Flavor[]>([
    { id: 'flavor-1', name: 'Small', vcpu: 1, ramGb: 1, storageGb: 10, monthlyPrice: 10, image: 'nginx:alpine' },
    { id: 'flavor-2', name: 'Medium', vcpu: 2, ramGb: 2, storageGb: 20, monthlyPrice: 20, image: 'nginx:alpine' },
    { id: 'flavor-3', name: 'Large', vcpu: 4, ramGb: 4, storageGb: 40, monthlyPrice: 40, image: 'nginx:alpine' },
  ])

  const [images] = useState<Image[]>([
    { id: 'img-1', name: 'Nginx Static', dockerImage: 'flashspys/nginx-static' },
    { id: 'img-2', name: 'Lighttpd', dockerImage: 'polygnome/lighttpd' },
    { id: 'img-3', name: 'Nginx Alpine', dockerImage: 'nginx:alpine' },
    { id: 'img-4', name: 'Apache Alpine', dockerImage: 'httpd:alpine' },
    { id: 'img-5', name: 'Caddy Alpine', dockerImage: 'caddy:alpine' },
  ])

  const [instanceName, setInstanceName] = useState('')
  const [selectedFlavorId, setSelectedFlavorId] = useState(flavors[0]?.id ?? '')
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

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => flavor.id === selectedFlavorId) ?? flavors[0],
    [flavors, selectedFlavorId],
  )

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? images[0],
    [images, selectedImageId],
  )

  const selectedTenant = useMemo(
    () => tenants.find(t => t.id === selectedTenantId),
    [tenants, selectedTenantId]
  )

  // Функция проверки возможности развертывания
  const canDeployForTenant = (tenantId: number, flavorId: string) => {
    const tenant = tenants.find(t => t.id === tenantId)
    const flavor = flavors.find(f => f.id === flavorId)
    
    if (!tenant || !flavor) {
      return { ok: false, reason: 'Invalid tenant or flavor selection.' }
    }

    const currentUsage = {
      vcpu: tenant.total_cpu || 0,
      ram: tenant.total_ram || 0,
      instances: tenant.total_vms || 0
    }

    const projected = {
      vcpu: currentUsage.vcpu + flavor.vcpu,
      ram: currentUsage.ram + (flavor.ramGb * 1024), // GB to MB
      instances: currentUsage.instances + 1
    }

    if (projected.vcpu > tenant.Quotum.cpu_limit) {
      return { ok: false, reason: 'CPU quota would be exceeded.' }
    }

    if (projected.ram > tenant.Quotum.ram_limit) {
      return { ok: false, reason: 'RAM quota would be exceeded.' }
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
    flavorId: string
    imageId: string
  }) => {
    const token = Cookies.get('token')
    const flavor = flavors.find(f => f.id === payload.flavorId)
    const image = images.find(i => i.id === payload.imageId)

    if (!flavor || !image) {
      throw new Error('Invalid flavor or image selection')
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
        cpu: flavor.vcpu,
        ram: flavor.ramGb * 1024, // Convert GB to MB
        disk: flavor.storageGb,
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

  const guard = canDeployForTenant(selectedTenantId as number, selectedFlavorId)
  const deployBlocked = !guard.ok || !instanceName.trim() || submitting

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (deployBlocked || !selectedFlavor || !selectedImageId || !selectedTenantId) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createVm({
        tenantId: selectedTenantId as number,
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
                  {image.name}
                </button>
              ))}
            </div>
          </div>
          <div className="deploy-footer">
            <p>
              Quota for {selectedTenant.Quotum.name}: {selectedTenant.Quotum.cpu_limit} vCPU, 
              {Number(selectedTenant.Quotum.ram_limit) / 1024}GB RAM
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