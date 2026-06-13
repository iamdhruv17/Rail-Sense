import React from 'react'

type Variant = 'default' | 'red' | 'amber' | 'green' | 'blue' | 'gray'

const variants: Record<Variant, string> = {
  default: 'bg-bg-secondary text-text-muted border-border',
  red:     'bg-accent-red/10 text-red-400 border-accent-red/30',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  green:   'bg-green-500/10 text-green-400 border-green-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gray:    'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export function Badge({ children, variant = 'default', className = '' }: {
  children: React.ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: Variant }> = {
    ON_TIME:          { label: 'On Time',          variant: 'green' },
    DELAYED:          { label: 'Delayed',           variant: 'amber' },
    SEVERELY_DELAYED: { label: 'Severely Delayed',  variant: 'red' },
    CANCELLED:        { label: 'Cancelled',         variant: 'gray' },
  }
  const cfg = map[status] || { label: status, variant: 'default' as Variant }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { label: string; variant: Variant }> = {
    CRITICAL: { label: 'CRITICAL', variant: 'red' },
    HIGH:     { label: 'HIGH',     variant: 'amber' },
    MEDIUM:   { label: 'MEDIUM',   variant: 'blue' },
    LOW:      { label: 'LOW',      variant: 'green' },
  }
  const cfg = map[severity] || { label: severity, variant: 'default' as Variant }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
