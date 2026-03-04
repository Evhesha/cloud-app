import { MetricCard } from '../shared/MetricCard'
import { StatusPill } from '../shared/StatusPill'
import type { NavItem, Stat, TableRow } from '../shared/types'

const menu: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'instances', label: 'Instances', icon: '◉' },
  { id: 'networks', label: 'Networks', icon: '◎' },
  { id: 'volumes', label: 'Volumes', icon: '◌' },
  { id: 'billing', label: 'Billing', icon: '$' },
]

const stats: Stat[] = [
  { label: 'CPU Usage', value: '75%', meta: '48 of 64 Cores Allocated', progress: 75, tone: 'blue' },
  { label: 'RAM Allocation', value: '80%', meta: '102GB of 128GB Used', progress: 80, tone: 'purple' },
  { label: 'Storage Capacity', value: '60%', meta: '1.2TB of 2.0TB Used', progress: 60, tone: 'amber' },
]

const rows: TableRow[] = [
  {
    name: 'web-server-prod-01',
    id: 'i-0294819284',
    status: 'RUNNING',
    config: '4 vCPU / 16GB RAM',
    ip: '192.168.1.104',
  },
  {
    name: 'billing-api-02',
    id: 'i-5621029182',
    status: 'RUNNING',
    config: '2 vCPU / 8GB RAM',
    ip: '192.168.1.118',
  },
  {
    name: 'analytics-worker-03',
    id: 'i-9847210211',
    status: 'MAINTENANCE',
    config: '8 vCPU / 32GB RAM',
    ip: '192.168.1.123',
  },
]

export function CustomerDashboardScreen() {
  return (
    <section className="dashboard-screen">
      <aside className="side-menu">
        <div className="brand-block">
          <span className="brand-mark" />
          <div>
            <strong>CloudAdmin</strong>
            <small>Enterprise IaaS</small>
          </div>
        </div>

        <nav>
          {menu.map((item) => (
            <a key={item.id} href="#" className={item.id === 'dashboard' ? 'active' : ''}>
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="usage-box">
          <p>Usage limit</p>
          <div className="meter-track">
            <div className="meter-fill blue" style={{ width: '75%' }} />
          </div>
          <small>75% of your total credits used</small>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="panel-header">
          <div>
            <h2>Resource Overview</h2>
            <StatusPill status="SYSTEMS ONLINE" />
          </div>
          <div className="profile-mini">
            <strong>Admin Account</strong>
            <small>Global Admin</small>
          </div>
        </header>

        <section>
          <div className="section-head">
            <h3>Resource Quotas</h3>
            <button type="button">View Detailed Stats</button>
          </div>
          <div className="card-grid three">
            {stats.map((item) => (
              <MetricCard
                key={item.label}
                title={item.label}
                value={item.value}
                meta={item.meta}
                progress={item.progress}
                tone={item.tone}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <div>
              <h3>Active Virtual Instances</h3>
              <small>Real-time status of your running virtual machines</small>
            </div>
            <button type="button" className="primary-btn">
              New Instance
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Instance Name</th>
                  <th>Status</th>
                  <th>Configuration</th>
                  <th>IP Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.id}</small>
                    </td>
                    <td>
                      <StatusPill status={row.status} />
                    </td>
                    <td>{row.config}</td>
                    <td className="mono">{row.ip}</td>
                    <td>
                      <button type="button">Power</button>
                      <button type="button">Reboot</button>
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
