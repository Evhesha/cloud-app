import { useCloud } from '../../context/CloudContext'
import { useAuth } from '../../context/AuthContext'
import type { NodeStatus } from '../../types/cloud'
import { useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import Cookies from 'js-cookie'

const nodeLabel: Record<NodeStatus, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
  maintenance: 'Maintenance',
}

function percent(used: number, quota: number) {
  if (!quota) {
    return 0
  }

  return Math.round((used / quota) * 100)
}

export function AdminPanelScreen() {
  const { logout } = useAuth()
  const { tenants, nodes, getTenantUsage } = useCloud()
  const [email, setEmail] = useState<string | null>(null)
 
  useEffect(() => {
    // try to read token from localStorage (change key if you store it elsewhere)

    const token = Cookies.get('token')
    
    
    console.log(token)
    if (!token) {
      return
    }
    const decodedToken = jwtDecode(token)
    console.log(decodedToken.email)
    try {
  
     // setEmail(decodedToken.email)

    } catch (err) {

      console.error(err)
    }
  }, [])

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Admin Panel</p>
            Welcome {email}
          
            <h2>Infrastructure Health</h2>
          </div>
          <button type="button" className="btn-secondary-pill" onClick={() => void logout()}>
            Logout
          </button>
        </header>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>System Health Matrix</h3>
              <p>Live node state map across availability zones</p>
            </div>
          </div>

          <div className="health-matrix">
            {nodes.map((node) => (
              <div key={node.id} className="health-cell" title={`${node.id}: ${nodeLabel[node.status]}`}>
                <span className={`health-dot ${node.status}`} />
              </div>
            ))}
          </div>

          <div className="legend-row">
            <span>
              <i className="health-dot healthy" /> Healthy
            </span>
            <span>
              <i className="health-dot warning" /> Warning
            </span>
            <span>
              <i className="health-dot critical" /> Critical
            </span>
            <span>
              <i className="health-dot maintenance" /> Maintenance
            </span>
          </div>
        </section>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>Tenant Resource Distribution</h3>
              <p>Quota utilization by tenant portfolio</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Segment</th>
                  <th>vCPU</th>
                  <th>RAM</th>
                  <th>Storage</th>
                  <th>Instances</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const usage = getTenantUsage(tenant.id)

                  return (
                    <tr key={tenant.id}>
                      <td>
                        <strong>{tenant.name}</strong>
                      </td>
                      <td>{tenant.segment}</td>
                      <td>
                        {usage.vcpu} / {tenant.quota.vcpu} ({percent(usage.vcpu, tenant.quota.vcpu)}%)
                      </td>
                      <td>
                        {usage.ramGb} / {tenant.quota.ramGb} GB ({percent(usage.ramGb, tenant.quota.ramGb)}%)
                      </td>
                      <td>
                        {usage.storageGb} / {tenant.quota.storageGb} GB ({percent(usage.storageGb, tenant.quota.storageGb)}%)
                      </td>
                      <td>
                        {usage.instances} / {tenant.quota.instances}
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
