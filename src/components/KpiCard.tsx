import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  color?: 'gold' | 'red' | 'blue' | 'green'
  className?: string
}

const colorMap = {
  gold: 'text-yellow-600 bg-yellow-100',
  red: 'text-red-700 bg-red-100',
  blue: 'text-blue-700 bg-blue-100',
  green: 'text-green-700 bg-green-100',
}

export function KpiCard({ title, value, subtitle, icon: Icon, color = 'gold', className }: KpiCardProps) {
  return (
    <div className={cn('glass-card rounded-xl p-5 flex items-start gap-4', className)}>
      <span className={cn('p-3 rounded-xl', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
