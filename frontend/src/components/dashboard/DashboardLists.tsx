import { ArrowRight, Bell, BriefcaseBusiness, CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../feedback/StatePanel'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'
import type { DashboardData } from '../../lib/api/dashboard'
import {
  statusLabels,
  type ApplicationStatus,
} from '../../lib/api/applications'

function statusTone(status: ApplicationStatus) {
  if (status === 'offer') return 'success'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  if (status === 'interview' || status === 'assessment') return 'warning'
  if (status === 'applied') return 'info'
  return 'neutral'
}

function formatDate(value: string | null) {
  if (!value) return 'Date not set'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function DashboardLists({ data }: { data: DashboardData }) {
  return (
    <section aria-label="Recent applications and upcoming events" className="grid gap-5 xl:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent applications</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The latest opportunities added to your workspace.
            </p>
          </div>
          <Link
            aria-label="View all applications"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
            to="/applications"
          >
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {data.recent_applications.length ? (
            <ul className="divide-y divide-border">
              {data.recent_applications.map((application) => (
                <li key={application.id}>
                  <Link
                    className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    to={`/applications/${application.id}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {application.job_title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {application.company_name} · {formatDate(application.application_date)}
                      </span>
                    </span>
                    <Badge className="shrink-0" tone={statusTone(application.status)}>
                      {statusLabels[application.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="Add an opportunity and it will appear here."
              icon={<BriefcaseBusiness aria-hidden="true" className="size-5" />}
              title="No applications yet"
            />
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Upcoming interviews</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Scheduled conversations that still need to happen.
          </p>
        </CardHeader>
        <CardContent>
          {data.upcoming_interviews.length ? (
            <ul className="divide-y divide-border">
              {data.upcoming_interviews.map((interview) => (
                <li key={interview.id}>
                  <Link
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    to={`/applications/${interview.application_id}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <CalendarClock aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {interview.job_title} · {interview.company_name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {interview.interview_type} · {formatDateTime(interview.scheduled_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="Future interviews will show here after you schedule them."
              icon={<CalendarClock aria-hidden="true" className="size-5" />}
              title="No upcoming interviews"
            />
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Upcoming follow-ups</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Incomplete reminders with a future due date.
          </p>
        </CardHeader>
        <CardContent>
          {data.upcoming_follow_ups.length ? (
            <ul className="divide-y divide-border">
              {data.upcoming_follow_ups.map((reminder) => (
                <li key={reminder.id}>
                  <Link
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    to={`/applications/${reminder.application_id}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <Bell aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {reminder.note || `Follow up: ${reminder.job_title}`}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {reminder.company_name} · {formatDateTime(reminder.due_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="Create a reminder to keep your next follow-up visible."
              icon={<Bell aria-hidden="true" className="size-5" />}
              title="No upcoming follow-ups"
            />
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Latest application activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Status changes recorded in your application history.
          </p>
        </CardHeader>
        <CardContent>
          {data.latest_activity.length ? (
            <ul className="divide-y divide-border">
              {data.latest_activity.map((activity) => (
                <li key={activity.id}>
                  <Link
                    className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    to={`/applications/${activity.application_id}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {activity.job_title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {activity.company_name} · Reached {statusLabels[activity.status]}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      {formatDateTime(activity.changed_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="Your saved status changes will appear here."
              icon={<BriefcaseBusiness aria-hidden="true" className="size-5" />}
              title="No activity yet"
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
