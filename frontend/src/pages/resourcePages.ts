import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  KanbanSquare,
  Settings2,
  type LucideIcon,
} from 'lucide-react'

export interface ResourcePageDefinition {
  path: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  icon: LucideIcon
}

export const resourcePages: ResourcePageDefinition[] = [
  {
    path: 'applications',
    title: 'Applications',
    description: 'Keep every role, company, and next step organized in one place.',
    emptyTitle: 'Your application list is ready',
    emptyDescription:
      'Application records will appear here once the frontend is connected to the applications API.',
    icon: BriefcaseBusiness,
  },
  {
    path: 'board',
    title: 'Kanban board',
    description: 'See every opportunity by stage and keep your search moving.',
    emptyTitle: 'Your board is ready',
    emptyDescription:
      'Application cards will be grouped by their current status after board data is connected.',
    icon: KanbanSquare,
  },
  {
    path: 'companies',
    title: 'Companies',
    description: 'Keep reusable company details alongside the roles you are tracking.',
    emptyTitle: 'Your company list is ready',
    emptyDescription:
      'Saved companies from your account will appear here when the companies API is connected.',
    icon: Building2,
  },
  {
    path: 'interviews',
    title: 'Interviews',
    description: 'Keep interview dates, formats, and notes easy to find.',
    emptyTitle: 'Your interview schedule is ready',
    emptyDescription:
      'Scheduled interviews will appear here once the frontend is connected to interview data.',
    icon: CalendarDays,
  },
  {
    path: 'reminders',
    title: 'Reminders',
    description: 'Keep upcoming follow-ups visible and overdue tasks easy to spot.',
    emptyTitle: 'Your reminders are ready',
    emptyDescription:
      'Upcoming and overdue reminders will appear here when reminder data is connected.',
    icon: Bell,
  },
  {
    path: 'analytics',
    title: 'Analytics',
    description: 'Understand your application pipeline and progress over time.',
    emptyTitle: 'Your insights will grow here',
    emptyDescription:
      'Charts and conversion metrics will use real status history when analytics endpoints are available.',
    icon: ChartNoAxesCombined,
  },
  {
    path: 'settings',
    title: 'Settings',
    description: 'Manage your preferences and account details.',
    emptyTitle: 'Preferences are coming later',
    emptyDescription:
      'Account settings are not available in the current API milestone.',
    icon: Settings2,
  },
]
