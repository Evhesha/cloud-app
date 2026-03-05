import type { VmStatus } from '../../types/cloud'

type StatusPillProps = {
  status: VmStatus | 'ACTIVE' | 'DISABLED'
}

const statusMap: Record<StatusPillProps['status'], { label: string; className: string }> = {
  RUNNING: { label: 'RUNNING', className: 'status-running' },
  PROVISIONING: { label: 'PROVISIONING', className: 'status-provisioning' },
  STOPPED: { label: 'STOPPED', className: 'status-stopped' },
  ERROR: { label: 'ERROR', className: 'status-error' },
  ACTIVE: { label: 'ACTIVE (RUNNING)', className: 'status-running' },
  DISABLED: { label: 'DISABLED (STOPPED)', className: 'status-stopped' },
}

export function StatusPill({ status }: StatusPillProps) {
  const view = statusMap[status]
  return <span className={`status-pill ${view.className}`}>{view.label}</span>
}
