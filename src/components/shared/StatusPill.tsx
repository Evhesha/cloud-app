type StatusPillProps = {
  status: 'RUNNING' | 'STOPPED' | 'MAINTENANCE' | 'SYSTEMS ONLINE'
}

export function StatusPill({ status }: StatusPillProps) {
  const tone =
    status === 'RUNNING' || status === 'SYSTEMS ONLINE'
      ? 'pill-green'
      : status === 'MAINTENANCE'
        ? 'pill-amber'
        : 'pill-red'

  return <span className={`status-pill ${tone}`}>{status}</span>
}
