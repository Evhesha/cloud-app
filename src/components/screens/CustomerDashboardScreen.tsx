import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { StatusPill } from '../shared/StatusPill'
import { EmptyStateCard } from '../shared/EmptyStateCard'
import { useAuth } from '../../context/AuthContext'
import Cookies from 'js-cookie'
import type { VmStatus } from '../../types/cloud'

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
  id: number
  tenantId: number
  name: string
  status: VmStatus
  vcpu: number
  ramGb: number
  storageGb: number
  osImage: string
  ip: string
}

type ApiVirtualMachine = {
  id: number
  tenant_id: number
  name: string
  status: 'creating' | 'running' | 'stopped' | 'suspended' | 'deleted'
  cpu: number
  ram: number
  disk: number
  image: string
  ip_address: string | null
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function mapVmStatus(status: ApiVirtualMachine['status']): VmStatus {
  if (status === 'running') return 'RUNNING'
  if (status === 'stopped') return 'STOPPED'
  if (status === 'creating') return 'PROVISIONING'
  return 'ERROR'
}

export function CustomerDashboardScreen() {
  const { user, logout } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [vms, setVms] = useState<VirtualMachine[]>([])
  const [loading, setLoading] = useState(true)

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
          return
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tenant: ${response.status}`)
        }

        const data = await response.json()
        console.log('Fetched my tenant:', data)
        setTenant(data)

        const vmsResponse = await fetch('http://localhost:3000/vms', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })

        if (vmsResponse.ok) {
          const vmsData: ApiVirtualMachine[] = await vmsResponse.json()
          const mappedVms: VirtualMachine[] = vmsData
            .filter((vm) => vm.status !== 'deleted')
            .map((vm) => ({
              id: vm.id,
              tenantId: vm.tenant_id,
              name: vm.name,
              status: mapVmStatus(vm.status),
              vcpu: vm.cpu,
              ramGb: Number(vm.ram) / 1024,
              storageGb: Number(vm.disk),
              osImage: vm.image,
              ip: vm.ip_address || '-',
            }))
          setVms(mappedVms)
        }

      } catch (error) {
        console.error('Error fetching tenant:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMyTenant()
  }, [])

  const handleToggleVmPower = async (vm: VirtualMachine) => {
    const action = vm.status === 'RUNNING' ? 'stop' : 'start'

    try {
      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vm.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} VM`)
      }

      setVms((prev) =>
        prev.map((item) =>
          item.id === vm.id
            ? { ...item, status: action === 'start' ? 'RUNNING' : 'STOPPED' }
            : item
        )
      )
    } catch (error) {
      console.error(`Error trying to ${action} VM:`, error)
      alert(error instanceof Error ? error.message : `Unable to ${action} instance.`)
    }
  }

  const handleDeleteVm = async (vm: VirtualMachine) => {
    try {
      const shouldDeleteVm = confirm(`Delete instance "${vm.name}"?`)
      if (!shouldDeleteVm) {
        return
      }

      const shouldDeleteImage = confirm(`Also delete image "${vm.osImage}" from host?`)
      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vm.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
        ,
        body: JSON.stringify({ remove_image: shouldDeleteImage })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete VM')
      }

      setVms((prev) => prev.filter((item) => item.id !== vm.id))
    } catch (error) {
      console.error('Error deleting VM:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete instance.')
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

          <section className="panel-flat">
            <EmptyStateCard
              kicker="Action Required"
              title="No Tenant Assigned"
              description="Your account is authenticated, but no tenant is linked yet. Ask your administrator to assign a project."
              email={user?.email}
            />
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
                          <button
                            type="button"
                            aria-label={vm.status === 'RUNNING' ? 'Stop' : 'Start'}
                            onClick={() => void handleToggleVmPower(vm)}
                            title={vm.status === 'RUNNING' ? 'Stop' : 'Start'}
                          >
                            {vm.status === 'RUNNING' ? '■' : '▶'}
                          </button>
                          <button 
                            type="button" 
                            aria-label="Delete" 
                            onClick={() => void handleDeleteVm(vm)} 
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
