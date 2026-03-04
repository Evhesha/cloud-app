import { MetricCard } from '../shared/MetricCard'
import { StatusPill } from '../shared/StatusPill'
import { Link } from "react-router-dom"

// Определяем тип для статусов
type InstanceStatus = "RUNNING" | "STOPPED" | "MAINTENANCE" | "SYSTEMS ONLINE";

// Создаем интерфейс для Instance, используя созданный тип
interface Instance {
  id: string;
  name: string;
  status: InstanceStatus; // Используем конкретный тип вместо string
  vcpu: number;
  ram: number;
  ip: string;
}

const tenant = {
  name: 'Acme Systems',
  project: 'Production',
  vpc: 'prod-vpc',
  quota: {
    cpu: 64,
    ram: 128,
    storage: 2000,
    instances: 10,
  },
  usage: {
    cpu: 48,
    ram: 102,
    storage: 1200,
    instances: 3,
  },
}

// Явно указываем тип для instances
const instances: Instance[] = [
  {
    id: 'vm-101',
    name: 'web-prod-01',
    status: 'RUNNING', // TypeScript теперь понимает, что это допустимое значение
    vcpu: 4,
    ram: 16,
    ip: '10.10.1.14',
  },
  {
    id: 'vm-102',
    name: 'billing-api',
    status: 'RUNNING',
    vcpu: 2,
    ram: 8,
    ip: '10.10.1.18',
  },
  {
    id: 'vm-103',
    name: 'analytics-worker',
    status: 'STOPPED',
    vcpu: 8,
    ram: 32,
    ip: '10.10.1.22',
  },
]

export function CustomerDashboardScreen() {
  const cpuPercent = (tenant.usage.cpu / tenant.quota.cpu) * 100
  const ramPercent = (tenant.usage.ram / tenant.quota.ram) * 100
  const storagePercent =
    (tenant.usage.storage / tenant.quota.storage) * 100

  return (
    <section className="dashboard-screen">
      <aside className="side-menu">
        <div className="brand-block">
          <span className="brand-mark" />
          <div>
            <strong>CloudPlatform</strong>
            <small>Tenant Panel</small>
          </div>
        </div>

        <nav>
          <a className="active">Dashboard</a>
          <a>Instances</a>
          <a>Networks</a>
          <a>Volumes</a>
        </nav>

        <div className="tenant-info-box">
          <p><strong>Tenant:</strong> {tenant.name}</p>
          <p><strong>Project:</strong> {tenant.project}</p>
          <p><strong>VPC:</strong> {tenant.vpc}</p>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="panel-header">
          <div>
            <h2>Resource Overview</h2>
            <small>Allocated resources within your tenant quota</small>
          </div>
        </header>

        <section>
          <div className="section-head">
            <h3>Quota Usage</h3>
          </div>

          <div className="card-grid three">
            <MetricCard
              title="vCPU"
              value={`${tenant.usage.cpu} / ${tenant.quota.cpu}`}
              meta="Allocated cores"
              progress={cpuPercent}
              tone="blue"
            />

            <MetricCard
              title="RAM (GB)"
              value={`${tenant.usage.ram} / ${tenant.quota.ram}`}
              meta="Allocated memory"
              progress={ramPercent}
              tone="purple"
            />

            <MetricCard
              title="Storage (GB)"
              value={`${tenant.usage.storage} / ${tenant.quota.storage}`}
              meta="Block storage usage"
              progress={storagePercent}
              tone="amber"
            />
          </div>
        </section>

        <section>
          <div className="section-head">
            <div>
              <h3>Virtual Machines</h3>
              <small>
                Isolated compute resources inside {tenant.vpc}
              </small>
            </div>

            <Link to="/create-instance">
              <button type="button" className="primary-btn">
                Create Instance
              </button>
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Configuration</th>
                  <th>Private IP</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {instances.map((vm) => (
                  <tr key={vm.id}>
                    <td>
                      <strong>{vm.name}</strong>
                      <br />
                      <small style={{ color: '#666' }}>{vm.id}</small>
                    </td>

                    <td>
                      <StatusPill status={vm.status} />
                    </td>

                    <td>
                      {vm.vcpu} vCPU / {vm.ram}GB RAM
                    </td>

                    <td className="mono">{vm.ip}</td>

                    <td>
                      <button 
                        type="button" 
                        className="action-btn"
                        onClick={() => console.log('Start', vm.id)}
                      >
                        Start
                      </button>
                      <button 
                        type="button" 
                        className="action-btn"
                        onClick={() => console.log('Stop', vm.id)}
                      >
                        Stop
                      </button>
                      <button 
                        type="button" 
                        className="action-btn"
                        onClick={() => console.log('Reboot', vm.id)}
                      >
                        Reboot
                      </button>
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