import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../ui/Card'

interface DashboardStatCardProps {
  icon: LucideIcon
  label: string
  value: number
  detail: string
}

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  detail,
}: DashboardStatCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {value.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
