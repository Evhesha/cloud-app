import { MetricCard } from '../shared/MetricCard'

const nodeHealth = [
  ...Array.from({ length: 18 }, () => 'ok'),
  'critical',
  ...Array.from({ length: 7 }, () => 'ok'),
  'maintenance',
  ...Array.from({ length: 6 }, () => 'ok'),
]

export function AdminPanelScreen() {
  return (
    <section className="admin-screen">
      <header className="top-nav compact">
        <div className="brand">
          <span className="brand-mark" />
          <strong>CloudAdmin IaaS</strong>
        </div>
        <nav>
          <a href="#">Dashboard</a>
          <a href="#" className="active">
            Hypervisors
          </a>
          <a href="#">Tenants</a>
          <a href="#">Network</a>
        </nav>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <p>Infrastructure</p>
          <a href="#" className="active">
            Global Overview
          </a>
          <a href="#">Compute Nodes</a>
          <a href="#">Tenant Management</a>
          <p>Monitoring</p>
          <a href="#">System Health</a>
          <a href="#">Audit Logs</a>
          <a href="#">IaaS Settings</a>
        </aside>

        <main className="admin-main">
          <div className="section-head">
            <div>
              <h3>Infrastructure Overview</h3>
              <small>Real-time global resource consumption and system status</small>
            </div>
            <div className="button-row">
              <button type="button" className="ghost-btn">
                Export Data
              </button>
              <button type="button" className="primary-btn">
                Provision Node
              </button>
            </div>
          </div>

          <div className="card-grid four">
            <MetricCard title="CPU Utilization" value="78.4%" meta="+2.4%" progress={78.4} tone="blue" />
            <MetricCard title="Memory Allocated" value="64.2 TB" meta="of 80 TB" progress={80} tone="purple" />
            <MetricCard title="Active Nodes" value="142/145" meta="-3 nodes" tone="green" />
            <MetricCard title="Storage IOPS" value="1.2M" meta="+12%" progress={45} tone="amber" />
          </div>

          <div className="card-grid two">
            <article className="panel-card">
              <header>
                <h4>Hypervisor Status</h4>
                <small>DC-AMSTERDAM-01</small>
              </header>
              <div className="node-grid">
                {nodeHealth.map((state, index) => (
                  <span key={index} className={`node ${state}`} />
                ))}
              </div>
              <div className="legend">
                <span><i className="node ok" /> Healthy</span>
                <span><i className="node critical" /> Critical</span>
                <span><i className="node maintenance" /> Maintenance</span>
              </div>
            </article>

            <article className="panel-card">
              <header>
                <h4>Tenant Load Distribution</h4>
                <small>Top infrastructure consumers</small>
              </header>
              <ul className="tenant-list">
                <li>
                  <strong>Acme Systems</strong>
                  <span>22.4 TB • 58 nodes</span>
                </li>
                <li>
                  <strong>Northwind Data</strong>
                  <span>18.9 TB • 43 nodes</span>
                </li>
                <li>
                  <strong>Vertex Labs</strong>
                  <span>13.3 TB • 29 nodes</span>
                </li>
              </ul>
            </article>
          </div>
        </main>
      </div>
    </section>
  )
}
