import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { statusLabels } from '../../lib/api/applications'
import type {
  ConversionMetric,
  DashboardData,
} from '../../lib/api/dashboard'
import { Card, CardContent, CardHeader } from '../ui/Card'

const statusColors: Record<string, string> = {
  wishlist: '#8a9690',
  applied: '#52779a',
  assessment: '#b67a29',
  interview: '#7b68a8',
  offer: '#31805e',
  rejected: '#b94a48',
  withdrawn: '#6f7773',
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function ConversionCard({
  title,
  metric,
}: {
  title: string
  metric: ConversionMetric
}) {
  const percentage = metric.rate_percent

  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">
          Applications that reached this stage, out of applications that reached Applied.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {percentage === null ? '—' : `${percentage.toFixed(2)}%`}
          </p>
          <p className="pb-1 text-xs text-muted-foreground">
            {metric.applications_reached_outcome} of{' '}
            {metric.applications_reached_applied}
          </p>
        </div>
        <div
          aria-label={
            percentage === null
              ? `${title}: not enough data`
              : `${title}: ${percentage.toFixed(2)} percent`
          }
          className="mt-3 h-5 w-full"
          role="img"
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              accessibilityLayer
              data={[{ label: title, rate: Math.min(percentage ?? 0, 100) }]}
              layout="vertical"
              margin={{ top: 3, right: 0, bottom: 3, left: 0 }}
            >
              <XAxis domain={[0, 100]} hide type="number" />
              <YAxis dataKey="label" hide type="category" />
              <Bar
                background={{ fill: '#eef2ef' }}
                barSize={10}
                dataKey="rate"
                fill="#2f6553"
                radius={5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {percentage === null ? (
          <p className="mt-2 text-xs text-muted-foreground">Not enough data yet.</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function DashboardCharts({ data }: { data: DashboardData }) {
  const hasApplications = data.stats.total_applications > 0

  return (
    <section aria-label="Application analytics" className="grid gap-5 xl:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            Applications over time
          </h2>
          <p className="text-xs text-muted-foreground">
            Applications by application date, month by month.
          </p>
        </CardHeader>
        <CardContent>
          {hasApplications ? (
            <div className="h-64 w-full" role="img" aria-label="Monthly application counts">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart
                  accessibilityLayer
                  data={data.applications_over_time}
                  margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e8ece8" strokeDasharray="3 3" />
                  <XAxis
                    axisLine={false}
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tickLine={false}
                    tick={{ fill: '#78827d', fontSize: 11 }}
                    minTickGap={18}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#78827d', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [value, 'Applications']}
                    labelFormatter={(label) => monthLabel(String(label))}
                    contentStyle={{
                      border: '1px solid #e8ece8',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px rgb(26 39 31 / 8%)',
                    }}
                  />
                  <Line
                    dataKey="count"
                    dot={{ fill: '#2f6553', r: 3 }}
                    stroke="#2f6553"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Application counts will appear here as you add opportunities.
            </div>
          )}
          <ul className="sr-only" aria-label="Monthly application data">
            {data.applications_over_time.map(({ month, count }) => (
              <li key={month}>
                {monthLabel(month)}: {count} applications
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            Applications by status
          </h2>
          <p className="text-xs text-muted-foreground">
            The current stage of every saved application.
          </p>
        </CardHeader>
        <CardContent>
          {hasApplications ? (
            <div className="grid min-h-64 gap-4 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
              <div className="h-64 min-w-0" role="img" aria-label="Application status distribution">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart accessibilityLayer>
                    <Pie
                      data={data.applications_by_status.filter((item) => item.count > 0)}
                      dataKey="count"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      nameKey="status"
                    >
                      {data.applications_by_status
                        .filter((item) => item.count > 0)
                        .map(({ status }) => (
                          <Cell fill={statusColors[status]} key={status} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        value,
                        statusLabels[name as keyof typeof statusLabels] ?? name,
                      ]}
                      contentStyle={{
                        border: '1px solid #e8ece8',
                        borderRadius: 12,
                        boxShadow: '0 8px 24px rgb(26 39 31 / 8%)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-1">
                {data.applications_by_status.map(({ status, count }) => (
                  <li className="flex items-center justify-between gap-2" key={status}>
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: statusColors[status] }}
                      />
                      <span className="truncate">{statusLabels[status]}</span>
                    </span>
                    <span className="font-medium tabular-nums text-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Your status distribution will appear here once applications are added.
            </div>
          )}
          <ul className="sr-only" aria-label="Application status data">
            {data.applications_by_status.map(({ status, count }) => (
              <li key={status}>
                {statusLabels[status]}: {count} applications
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ConversionCard
        metric={data.interview_conversion}
        title="Interview conversion rate"
      />
      <ConversionCard metric={data.offer_conversion} title="Offer conversion rate" />
    </section>
  )
}
