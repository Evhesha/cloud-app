import type { VmStatus } from '../../types/cloud'

type StatusPillProps = {
  status: VmStatus
}

const statusMap: Record<VmStatus, { label: string; className: string }> = {
  RUNNING: { label: 'RUNNING', className: 'status-running' },
  PROVISIONING: { label: 'PROVISIONING', className: 'status-provisioning' },
  STOPPED: { label: 'STOPPED', className: 'status-stopped' },
  ERROR: { label: 'ERROR', className: 'status-error' },
}

export function StatusPill({ status }: StatusPillProps) {
  const view = statusMap[status]
  return <span className={`status-pill ${view.className}`}>{view.label}</span>
}
