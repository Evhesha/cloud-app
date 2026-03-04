import type { ReactNode } from 'react'

export type NavItem = {
  id: string
  label: string
  icon: string
}

export type Stat = {
  label: string
  value: string
  meta: string
  progress: number
  tone?: 'blue' | 'purple' | 'amber' | 'green'
}

export type TableRow = {
  name: string
  id: string
  status: 'RUNNING' | 'STOPPED' | 'MAINTENANCE'
  config: string
  ip: string
}

export type MetricCardProps = {
  title: string
  value: string
  meta: string
  progress?: number
  rightSlot?: ReactNode
  tone?: 'blue' | 'purple' | 'amber' | 'green'
}
