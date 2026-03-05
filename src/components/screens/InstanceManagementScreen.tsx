import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import { StatusPill } from '../shared/StatusPill'
import type { VmStatus } from '../../types/cloud'

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

function mapVmStatus(status: ApiVirtualMachine['status']): VmStatus {
  if (status === 'running') return 'RUNNING'
  if (status === 'stopped') return 'STOPPED'
  if (status === 'creating') return 'PROVISIONING'
  return 'ERROR'
}

export function InstanceManagementScreen() {
  const navigate = useNavigate()
  const { instanceId } = useParams<{ instanceId: string }>()
  const vmId = Number(instanceId)

  const [vm, setVm] = useState<VirtualMachine | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVm = async () => {
      try {
        setLoading(true)
        const token = Cookies.get('token')
        const response = await fetch(`http://localhost:3000/vms/${vmId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load instance')
        }

        const apiVm: ApiVirtualMachine = await response.json()
        setVm({
          id: apiVm.id,
          tenantId: apiVm.tenant_id,
          name: apiVm.name,
          status: mapVmStatus(apiVm.status),
          vcpu: apiVm.cpu,
          ramGb: Number(apiVm.ram) / 1024,
          storageGb: Number(apiVm.disk),
          osImage: apiVm.image,
          ip: apiVm.ip_address || '-',
        })
      } catch (error) {
        console.error('Error loading instance:', error)
        setVm(null)
      } finally {
        setLoading(false)
      }
    }

    if (Number.isFinite(vmId)) {
      void fetchVm()
    } else {
      setLoading(false)
    }
  }, [vmId])

  const powerAction = useMemo(() => (vm?.status === 'RUNNING' ? 'stop' : 'start'), [vm])

  const handleTogglePower = async () => {
    if (!vm) return

    try {
      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vm.id}/${powerAction}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${powerAction} instance`)
      }

      setVm((prev) => (prev ? { ...prev, status: powerAction === 'start' ? 'RUNNING' : 'STOPPED' } : prev))
    } catch (error) {
      console.error(`Error trying to ${powerAction} instance:`, error)
      alert(error instanceof Error ? error.message : `Unable to ${powerAction} instance.`)
    }
  }

  const handleDelete = async () => {
    if (!vm) return

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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remove_image: shouldDeleteImage }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete instance')
      }

      navigate('/customer-dashboard')
    } catch (error) {
      console.error('Error deleting instance:', error)
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

  if (!vm) {
    return (
      <section className="mts-page">
        <main className="mts-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Instance Not Found</h2>
            <NavLink to="/customer-dashboard" className="btn-primary-pill">
              Back to Dashboard
            </NavLink>
          </div>
        </main>
      </section>
    )
  }

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Instance Management</p>
            <h2>{vm.name}</h2>
            <p>{`Instance #${vm.id}`}</p>
          </div>
          <NavLink to="/customer-dashboard" className="btn-secondary-pill">
            Back
          </NavLink>
        </header>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>Instance Details</h3>
              <p>Manage lifecycle and deletion options</p>
            </div>
          </div>

          <div className="quota-stack" style={{ marginBottom: '16px' }}>
            <span>Status: <StatusPill status={vm.status} /></span>
            <span>Resources: {vm.vcpu} vCPU / {vm.ramGb}GB RAM / {vm.storageGb}GB Storage</span>
            <span>Image: {vm.osImage}</span>
            <span>IP: {vm.ip}</span>
          </div>

          <div className="tenant-actions">
            <button
              type="button"
              className="btn-primary-pill"
              onClick={() => void handleTogglePower()}
            >
              {vm.status === 'RUNNING' ? 'Stop Instance' : 'Start Instance'}
            </button>
            <button
              type="button"
              className="btn-secondary-pill"
              onClick={() => void handleDelete()}
            >
              Delete Instance
            </button>
          </div>
        </section>
      </main>
    </section>
  )
}
