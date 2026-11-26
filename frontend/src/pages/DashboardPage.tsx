import { ArrowRight, BriefcaseBusiness, CalendarClock, ChartNoAxesCombined } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/feedback/StatePanel'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Card, CardContent, CardHeader } from '../components/ui/Card'

const highlights = [
  {
    icon: BriefcaseBusiness,
    title: 'Applications',
    description: 'Keep company details, role information, and progress together.',
    to: '/applications',
  },
  {
    icon: CalendarClock,
    title: 'Interviews & reminders',
    description: 'Keep track of important conversations and follow-up dates.',
    to: '/interviews',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Progress insights',
    description: 'Understand how your search is moving over time.',
    to: '/analytics',
  },
]

export function DashboardPage() {
  return (
    <>
      <PageHeader
        description="A thoughtful home for every opportunity, conversation, and next step."
        eyebrow="Your workspace"
        title="Your search, at a glance."
      />

      <section
        aria-label="Dashboard overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {['Total applications', 'In progress', 'Interviews', 'Offers received'].map(
          (label) => (
            <Card className="min-h-[132px]" key={label}>
              <CardHeader className="pb-0">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[28px] font-semibold tracking-tight text-foreground">
                    —
                  </span>
                  <span className="text-xs text-muted-foreground">Awaiting data</span>
                </div>
              </CardHeader>
              <CardContent className="pt-2" />
            </Card>
          ),
        )}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
        <Card className="min-h-[340px]">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your latest updates will appear here.
              </p>
            </div>
            <Badge tone="info">Dashboard API coming next</Badge>
          </CardHeader>
          <CardContent>
            <EmptyState
              description="The backend does not expose a dashboard activity summary yet. This space will fill with real application updates when that endpoint is available."
              icon={<BriefcaseBusiness aria-hidden="true" className="size-5" />}
              title="Your activity starts here"
            />
          </CardContent>
        </Card>

        <Card className="min-h-[340px]">
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">A little direction</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Everything you need to keep a search moving.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {highlights.map(({ icon: Icon, title, description, to }) => (
              <Link
                className="group flex gap-3 rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                key={title}
                to={to}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                    {title}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {description}
                  </span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
