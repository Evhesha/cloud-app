import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../../context/AuthContext'
import { StatusPill } from '../shared/StatusPill'

type TokenPayload = {
  email?: string
}

type Capacity = {
  vcpu: number
  ramGb: number
  storageGb: number
  instances: number
}

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

const physicalCapacity: Capacity = {
  vcpu: 512,
  ramGb: 2048,
  storageGb: 12000,
  instances: 300,
}

function percent(used: number, total: number) {
  if (!total) {
    return 0
  }
  return Math.round((used / total) * 100)
}

function healthClass(usagePercent: number) {
  if (usagePercent > 90) {
    return 'util-critical'
  }
  if (usagePercent >= 70) {
    return 'util-warning'
  }
  return 'util-healthy'
}

export function AdminPanelScreen() {
  const { user, logout } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true)
        const token = Cookies.get('token')
        const response = await fetch('http://localhost:3000/tenants', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
        
        const data = await response.json()
        console.log('Fetched tenants:', data)
        setTenants(data)
      } catch (error) {
        console.error('Error fetching tenants:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTenants()
  }, [])

  const tokenEmail = useMemo(() => {
    const token = Cookies.get('token')
    if (!token) {
      return null
    }

    try {
      const payload = jwtDecode<TokenPayload>(token)
      return payload.email ?? null
    } catch {
      return null
    }
  }, [])

  const welcomeEmail = tokenEmail ?? user?.email ?? 'unknown'

  const global = useMemo(() => {
  console.log('Computing global with tenants:', tenants)
  
  // Проверяем, что tenants существует и это массив
  if (!tenants || !Array.isArray(tenants) || tenants.length === 0) {
    console.log('No tenants available, returning default values')
    return {
      allocated: { vcpu: 0, ramGb: 0, storageGb: 0, instances: 0 },
      vcpuPercent: 0,
      ramPercent: 0,
      storagePercent: 0,
      instancePercent: 0,
    }
  }

  try {
    const allocated = tenants.reduce(
      (acc, tenant) => {
        // Проверяем, что tenant существует
        if (!tenant) {
          console.warn('Found undefined tenant')
          return acc
        }

        // Проверяем наличие Quotum
        if (tenant.Quotum) {
          acc.vcpu += tenant.Quotum.cpu_limit || 0
          acc.ramGb += Number(tenant.Quotum.ram_limit) / 1024 || 0
          acc.storageGb += Number(tenant.Quotum.disk_limit) || 0
          acc.instances += tenant.Quotum.vm_limit || 0
        } else {
          console.warn('Tenant missing Quotum:', tenant)
        }
        return acc
      },
      { vcpu: 0, ramGb: 0, storageGb: 0, instances: 0 },
    )

    console.log('Allocated totals:', allocated)

    return {
      allocated,
      vcpuPercent: percent(allocated.vcpu, physicalCapacity.vcpu),
      ramPercent: percent(allocated.ramGb, physicalCapacity.ramGb),
      storagePercent: percent(allocated.storageGb, physicalCapacity.storageGb),
      instancePercent: percent(allocated.instances, physicalCapacity.instances),
    }
  } catch (error) {
    console.error('Error in global useMemo:', error)
    return {
      allocated: { vcpu: 0, ramGb: 0, storageGb: 0, instances: 0 },
      vcpuPercent: 0,
      ramPercent: 0,
      storagePercent: 0,
      instancePercent: 0,
    }
  }
}, [tenants])

  // Функция для получения использования (заглушка, пока нет реальных данных)
  const getTenantUsage = (tenant: Tenant) => {
    return {
      vcpu: tenant.total_cpu || 0,
      ramGb: tenant.total_ram ? Number(tenant.total_ram) / 1024 : 0,
      storageGb: Number(tenant.total_disk) || 0,
      instances: tenant.total_vms || 0,
    }
  }

  const handleDeleteTenant = async (tenantId: number) => {
  // Запрашиваем подтверждение
  if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
    return
  }

  try {
    const token = Cookies.get('token')
    const response = await fetch(`http://localhost:3000/tenants/${tenantId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      
      // Обрабатываем специфические ошибки
      if (response.status === 409) {
        alert('Cannot delete tenant: it still has virtual machines. Please delete all VMs first.')
        return
      }
      
      throw new Error(errorData.error || 'Failed to delete tenant')
    }
    
    // Если удаление успешно, обновляем список
    setTenants(tenants.filter(t => t.id !== tenantId))
    
  } catch (error) {
    console.error('Error deleting tenant:', error)
    alert(error instanceof Error ? error.message : 'Failed to delete tenant')
  }
}

  const handleToggleStatus = async (tenantId: number) => {
    try {
      const token = Cookies.get('token')
      const tenant = tenants.find(t => t.id === tenantId)
      
      const response = await fetch(`http://localhost:3000/tenants/${tenantId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !tenant?.is_active
        })
      })
      
      if (response.ok) {
        setTenants(tenants.map(t => 
          t.id === tenantId 
            ? { ...t, is_active: !t.is_active } 
            : t
        ))
      }
    } catch (error) {
      console.error('Error toggling tenant status:', error)
    }
  }

  if (loading) {
    return <div>Loading tenants...</div>
  }

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Admin Panel</p>
            <p>{`Welcome ${welcomeEmail}`}</p>
            <h2>Global Infrastructure Overview</h2>
          </div>
          <div className="page-actions">
            <NavLink to="/create-tenant" className="btn-primary-pill">
              Add New Tenant
            </NavLink>
            <button type="button" className="btn-secondary-pill" onClick={() => void logout()}>
              Logout
            </button>
          </div>
        </header>

        <section className="panel-flat overview-grid">
          <article className="overview-card">
            <strong>vCPU Capacity</strong>
            <p>
              {global.allocated.vcpu} / {physicalCapacity.vcpu}
            </p>
            <div className="util-track">
              <span className={healthClass(global.vcpuPercent)} style={{ width: `${global.vcpuPercent}%` }} />
            </div>
          </article>

          <article className="overview-card">
            <strong>RAM Capacity</strong>
            <p>
              {global.allocated.ramGb} / {physicalCapacity.ramGb} GB
            </p>
            <div className="util-track">
              <span className={healthClass(global.ramPercent)} style={{ width: `${global.ramPercent}%` }} />
            </div>
          </article>

          <article className="overview-card">
            <strong>Storage Capacity</strong>
            <p>
              {global.allocated.storageGb} / {physicalCapacity.storageGb} GB
            </p>
            <div className="util-track">
              <span className={healthClass(global.storagePercent)} style={{ width: `${global.storagePercent}%` }} />
            </div>
          </article>

          <article className="overview-card">
            <strong>Instance Slots</strong>
            <p>
              {global.allocated.instances} / {physicalCapacity.instances}
            </p>
            <div className="util-track">
              <span className={healthClass(global.instancePercent)} style={{ width: `${global.instancePercent}%` }} />
            </div>
          </article>
        </section>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>Tenant Lifecycle Control</h3>
              <p>Manage quotas, status, and logical tenancy states</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant ID</th>
                  <th>Quota Name</th>
                  <th>Quotas</th>
                  <th>Resource Utilization</th>
                  <th>Tenant Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const usage = getTenantUsage(tenant)
                  const quota = tenant.Quotum

                  const vcpuPct = percent(usage.vcpu, quota.cpu_limit)
                  const ramPct = percent(usage.ramGb, Number(quota.ram_limit) / 1024)
                  const storagePct = percent(usage.storageGb, Number(quota.disk_limit))
                  const instancePct = percent(usage.instances, quota.vm_limit)
                  const isDisabled = !tenant.is_active

                  return (
                    <tr key={tenant.id} className={isDisabled ? 'tenant-row-disabled' : ''}>
                      <td>
                        <strong>Tenant #{tenant.id}</strong>
                        <small>Quota ID: {tenant.quota_id}</small>
                      </td>
                      <td>
                        <strong>{quota.name}</strong>
                      </td>
                      <td>
                        <div className="quota-stack">
                          <span>vCPU: {quota.cpu_limit}</span>
                          <span>RAM: {Number(quota.ram_limit) / 1024} GB</span>
                          <span>Storage: {quota.disk_limit} GB</span>
                          <span>Max Instances: {quota.vm_limit}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`util-stack ${isDisabled ? 'offline' : ''}`}>
                          {isDisabled && <small className="offline-mark">Offline</small>}
                          <div>
                            <small>vCPU {usage.vcpu}/{quota.cpu_limit}</small>
                            <div className="util-track">
                              <span className={healthClass(vcpuPct)} style={{ width: `${vcpuPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <small>RAM {usage.ramGb}/{Number(quota.ram_limit) / 1024} GB</small>
                            <div className="util-track">
                              <span className={healthClass(ramPct)} style={{ width: `${ramPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <small>Storage {usage.storageGb}/{quota.disk_limit} GB</small>
                            <div className="util-track">
                              <span className={healthClass(storagePct)} style={{ width: `${storagePct}%` }} />
                            </div>
                          </div>
                          <div>
                            <small>Instances {usage.instances}/{quota.vm_limit}</small>
                            <div className="util-track">
                              <span className={healthClass(instancePct)} style={{ width: `${instancePct}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusPill status={tenant.is_active ? 'ACTIVE' : 'DISABLED'} />
                      </td>
                      <td>
                        <div className="tenant-actions">
                          <NavLink to={`/tenant-management/${tenant.id}`} className="btn-primary-pill quota-btn">
                            Tenant Management
                          </NavLink>
                          <button
                            type="button"
                            className="btn-secondary-pill icon-pill"
                            onClick={() => void handleToggleStatus(tenant.id)}
                            title={tenant.is_active ? 'Disable tenant' : 'Activate tenant'}
                          >
                            ⏻
                          </button>
                          <button
  type="button"
  className="btn-secondary-pill icon-pill"
  onClick={() => handleDeleteTenant(tenant.id)}
  title="Delete tenant"
>
  🗑
</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </section>
  )
}