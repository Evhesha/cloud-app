type EmptyStateCardProps = {
  kicker: string
  title: string
  description: string
  email?: string
  supportHref?: string
}

export function EmptyStateCard({
  kicker,
  title,
  description,
  email,
  supportHref = 'mailto:support@mtscloud.local',
}: EmptyStateCardProps) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-card">
        <div className="empty-state-icon" aria-hidden="true">
          🔒
        </div>

        <p className="mts-kicker">{kicker}</p>
        <h3 className="empty-state-title">{title}</h3>

        <div className="empty-state-warning">
          <p>{description}</p>
          {email && <code className="email-code-badge">{email}</code>}
        </div>

        <a className="btn-secondary-pill" href={supportHref}>
          Contact Support
        </a>
      </div>
    </div>
  )
}
