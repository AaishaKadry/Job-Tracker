import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  KanbanSquare,
  LayoutDashboard,
  Settings2,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Applications', to: '/applications', icon: BriefcaseBusiness },
  { label: 'Kanban Board', to: '/board', icon: KanbanSquare },
  { label: 'Companies', to: '/companies', icon: Building2 },
  { label: 'Interviews', to: '/interviews', icon: CalendarDays },
  { label: 'Reminders', to: '/reminders', icon: Bell },
  { label: 'Analytics', to: '/analytics', icon: ChartNoAxesCombined },
  { label: 'Settings', to: '/settings', icon: Settings2 },
]
