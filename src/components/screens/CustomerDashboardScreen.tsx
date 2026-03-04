import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
import { StatusPill } from '../shared/StatusPill'
import { useCloud } from '../../context/CloudContext'
import { useAuth } from '../../context/AuthContext'
import { tenantByUserEmail } from '../../data/mockCloud'

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function CustomerDashboardScreen() {
  const { user, logout } = useAuth()
  const { tenants, vms, getTenantUsage, deleteVm } = useCloud()

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

  const tenantVms = vms.filter((vm) => vm.tenantId === activeTenant.id)
  const usage = getTenantUsage(activeTenant.id)

  const vcpuPercent = clampPercent((usage.vcpu / activeTenant.quota.vcpu) * 100)
  const ramPercent = clampPercent((usage.ramGb / activeTenant.quota.ramGb) * 100)

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Customer Dashboard</p>
            <h2>Resource Overview</h2>
            <p>{`Project: ${activeTenant.name}`}</p>
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
                {usage.vcpu} / {activeTenant.quota.vcpu}
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
                {usage.ramGb}GB / {activeTenant.quota.ramGb}GB
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
                {usage.instances} / {activeTenant.quota.instances}
              </span>
            </div>
            <div className="stat-track">
              <div
                className="stat-fill"
                style={{ width: `${clampPercent((usage.instances / activeTenant.quota.instances) * 100)}%` }}
              />
            </div>
          </article>
        </section>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>Instances</h3>
              <p>Virtual resources inside {activeTenant.name}</p>
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
                {tenantVms.map((vm) => (
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
                        <button type="button" aria-label="Start">
                          ▶
                        </button>
                        <button type="button" aria-label="Stop">
                          ■
                        </button>
                        <button type="button" aria-label="Restart">
                          ↻
                        </button>
                        <button type="button" aria-label="Delete" onClick={() => deleteVm(vm.id)} title="Delete">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </section>
  )
}
