import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { useCloud } from '../../context/CloudContext'
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
  const { tenants, getTenantUsage, deleteTenant, toggleTenantStatus } = useCloud()

  useEffect() => {
    
  }

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
    const allocated = tenants.reduce(
      (acc, tenant) => {
        acc.vcpu += tenant.quota.vcpu
        acc.ramGb += tenant.quota.ramGb
        acc.storageGb += tenant.quota.storageGb
        acc.instances += tenant.quota.instances
        return acc
      },
      { vcpu: 0, ramGb: 0, storageGb: 0, instances: 0 },
    )

    return {
      allocated,
      vcpuPercent: percent(allocated.vcpu, physicalCapacity.vcpu),
      ramPercent: percent(allocated.ramGb, physicalCapacity.ramGb),
      storagePercent: percent(allocated.storageGb, physicalCapacity.storageGb),
      instancePercent: percent(allocated.instances, physicalCapacity.instances),
    }
  }, [tenants])

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
                  <th>Tenant Name</th>
                  <th>Quotas</th>
                  <th>Resource Utilization</th>
                  <th>Tenant Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const usage = getTenantUsage(tenant.id)

                  const vcpuPct = percent(usage.vcpu, tenant.quota.vcpu)
                  const ramPct = percent(usage.ramGb, tenant.quota.ramGb)
                  const storagePct = percent(usage.storageGb, tenant.quota.storageGb)
                  const instancePct = percent(usage.instances, tenant.quota.instances)
                  const isDisabled = tenant.status === 'DISABLED'

                  return (
                    <tr key={tenant.id} className={isDisabled ? 'tenant-row-disabled' : ''}>
                      <td>
                        <strong>{tenant.name}</strong>
                        <small>{tenant.ownerEmail}</small>
                      </td>
                      <td>
                        <div className="quota-stack">
                          <span>vCPU: {tenant.quota.vcpu}</span>
                          <span>RAM: {tenant.quota.ramGb} GB</span>
                          <span>Storage: {tenant.quota.storageGb} GB</span>
                          <span>Max Instances: {tenant.quota.instances}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`util-stack ${isDisabled ? 'offline' : ''}`}>
                          {isDisabled && <small className="offline-mark">Offline</small>}
                          <div>
                            <small>vCPU {usage.vcpu}/{tenant.quota.vcpu}</small>
                            <div className="util-track">
                              <span className={healthClass(vcpuPct)} style={{ width: `${vcpuPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <small>RAM {usage.ramGb}/{tenant.quota.ramGb} GB</small>
                            <div className="util-track">
                              <span className={healthClass(ramPct)} style={{ width: `${ramPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <small>Storage {usage.storageGb}/{tenant.quota.storageGb} GB</small>
                            <div className="util-track">
                              <span className={healthClass(storagePct)} style={{ width: `${storagePct}%` }} />
                            </div>
                          </div>
                          <div>
                            <small>Instances {usage.instances}/{tenant.quota.instances}</small>
                            <div className="util-track">
                              <span className={healthClass(instancePct)} style={{ width: `${instancePct}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusPill status={tenant.status} />
                      </td>
                      <td>
                        <div className="tenant-actions">
                          <NavLink to={`/tenant-management/${tenant.id}`} className="btn-primary-pill quota-btn">
                            Tenant Management
                          </NavLink>
                          <button
                            type="button"
                            className="btn-secondary-pill icon-pill"
                            onClick={() => void toggleTenantStatus(tenant.id)}
                            title={tenant.status === 'ACTIVE' ? 'Disable tenant' : 'Activate tenant'}
                          >
                            ⏻
                          </button>
                          <button
                            type="button"
                            className="btn-secondary-pill icon-pill"
                            onClick={() => void deleteTenant(tenant.id)}
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
