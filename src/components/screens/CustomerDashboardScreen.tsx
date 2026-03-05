import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { StatusPill } from '../shared/StatusPill'
import { useAuth } from '../../context/AuthContext'
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

type VirtualMachine = {
  id: string
  tenantId: string
  name: string
  status: string
  vcpu: number
  ramGb: number
  storageGb: number
  osImage: string
  ip: string
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function CustomerDashboardScreen() {
  const { user, logout } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [vms, setVms] = useState<VirtualMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загружаем тенант текущего пользователя
  useEffect(() => {
    const fetchMyTenant = async () => {
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
          setTenant(null)
          setError(null)
          return
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tenant: ${response.status}`)
        }

        const data = await response.json()
        console.log('Fetched my tenant:', data)
        setTenant(data)

        // Здесь можно загрузить VM для этого тенанта
        // const vmsResponse = await fetch(`http://localhost:3000/tenants/${data.id}/vms`, {
        //   headers: { 'Authorization': `Bearer ${token}` }
        // })
        // const vmsData = await vmsResponse.json()
        // setVms(vmsData)

      } catch (error) {
        console.error('Error fetching tenant:', error)
        setError('Failed to load tenant data')
      } finally {
        setLoading(false)
      }
    }

    fetchMyTenant()
  }, [])

  const handleDeleteVm = async (vmId: string) => {
    try {
      const token = Cookies.get('token')
      await fetch(`http://localhost:3000/vms/${vmId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
      setVms(vms.filter(vm => vm.id !== vmId))
    } catch (error) {
      console.error('Error deleting VM:', error)
    }
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

  if (!tenant) {
    return (
      <section className="mts-page">
        <main className="mts-main">
          <header className="page-head">
            <div>
              <p className="mts-kicker">Customer Dashboard</p>
              <h2>No Tenant Assigned</h2>
            </div>
            <div className="page-actions">
              <button type="button" className="btn-secondary-pill" onClick={() => void logout()}>
                Logout
              </button>
            </div>
          </header>

          <section className="panel-flat" style={{ textAlign: 'center', padding: '40px' }}>
            <h3>Tenant wasn't given to you</h3>
            <p style={{ marginTop: '16px', color: '#666' }}>
              Please contact your administrator to assign a tenant to your account.
            </p>
            <p style={{ marginTop: '8px', color: '#666' }}>
              Your email: {user?.email}
            </p>
          </section>
        </main>
      </section>
    )
  }

  const usage = {
    vcpu: tenant.total_cpu || 0,
    ramGb: tenant.total_ram ? Number(tenant.total_ram) / 1024 : 0,
    instances: tenant.total_vms || 0,
  }

  const vcpuPercent = clampPercent((usage.vcpu / tenant.Quotum.cpu_limit) * 100)
  const ramPercent = clampPercent((usage.ramGb / (Number(tenant.Quotum.ram_limit) / 1024)) * 100)
  const instancePercent = clampPercent((usage.instances / tenant.Quotum.vm_limit) * 100)

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Customer Dashboard</p>
            <h2>Resource Overview</h2>
            <p>{`Project: ${tenant.Quotum.name} (Tenant #${tenant.id})`}</p>
          </div>
          <div className="page-actions">
            <NavLink to="/create-instance" className="btn-primary-pill">
              New Instance
            </NavLink>
            <button type="button" className="btn-secondary-pill" onClick={() => void logout()}>
              Logout
            </button>
          </div>
        </header>

        <section className="stat-bar-panel">
          <article>
            <div className="stat-head">
              <strong>vCPU Allocation</strong>
              <span>
                {usage.vcpu} / {tenant.Quotum.cpu_limit}
              </span>
            </div>
            <div className="stat-track">
              <div className="stat-fill" style={{ width: `${vcpuPercent}%` }} />
            </div>
          </article>

          <article>
            <div className="stat-head">
              <strong>RAM Allocation</strong>
              <span>
                {usage.ramGb}GB / {Number(tenant.Quotum.ram_limit) / 1024}GB
              </span>
            </div>
            <div className="stat-track">
              <div className="stat-fill" style={{ width: `${ramPercent}%` }} />
            </div>
          </article>

          <article>
            <div className="stat-head">
              <strong>Instances</strong>
              <span>
                {usage.instances} / {tenant.Quotum.vm_limit}
              </span>
            </div>
            <div className="stat-track">
              <div
                className="stat-fill"
                style={{ width: `${instancePercent}%` }}
              />
            </div>
          </article>
        </section>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>Instances</h3>
              <p>Virtual resources inside {tenant.Quotum.name}</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Configuration</th>
                  <th>OS</th>
                  <th>IP</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vms.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      No instances found
                    </td>
                  </tr>
                ) : (
                  vms.map((vm) => (
                    <tr key={vm.id}>
                      <td>
                        <strong>{vm.name}</strong>
                        <small>{vm.id}</small>
                      </td>
                      <td>
                        <StatusPill status={vm.status} />
                      </td>
                      <td>
                        {vm.vcpu} vCPU / {vm.ramGb}GB
                      </td>
                      <td>{vm.osImage}</td>
                      <td className="mono">{vm.ip}</td>
                      <td>
                        <div className="action-group">
                          <button type="button" aria-label="Start">▶</button>
                          <button type="button" aria-label="Stop">■</button>
                          <button type="button" aria-label="Restart">↻</button>
                          <button 
                            type="button" 
                            aria-label="Delete" 
                            onClick={() => handleDeleteVm(vm.id)} 
                            title="Delete"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </section>
  )
}