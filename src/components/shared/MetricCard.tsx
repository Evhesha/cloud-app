import type { MetricCardProps } from './types'

export function MetricCard({
  title,
  value,
  meta,
  progress,
  rightSlot,
  tone = 'blue',
}: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <p>{title}</p>
        {rightSlot ?? <span className={`dot ${tone}`} />}
      </div>
      <div className="metric-main">
        <h4>{value}</h4>
        <span>{meta}</span>
      </div>
      {typeof progress === 'number' && (
        <div className="meter-track">
          <div
            className={`meter-fill ${tone}`}
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      )}
    </article>
  )
}
