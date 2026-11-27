import { lazy, Suspense } from 'react'
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CircleX,
  Layers3,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { DashboardLists } from '../components/dashboard/DashboardLists'
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard'
import { ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { PageHeader } from '../components/layout/PageHeader'
import { buttonVariants } from '../components/ui/buttonVariants'
import { useDashboardData } from '../hooks/useDashboardData'
import { cn } from '../lib/utils'

const DashboardCharts = lazy(() =>
  import('../components/dashboard/DashboardCharts').then((module) => ({
    default: module.DashboardCharts,
  })),
)

export function DashboardPage() {
  const { data, error, isLoading, retry } = useDashboardData()

  return (
    <>
      <PageHeader
        actions={
          <Link className={cn(buttonVariants())} to="/applications/new">
            <Plus aria-hidden="true" className="size-4" />
            Add application
          </Link>
        }
        description="A thoughtful home for every opportunity, conversation, and next step."
        eyebrow="Your workspace"
        title="Your search, at a glance."
      />

      {isLoading ? (
        <LoadingState label="Loading your dashboard" />
      ) : error ? (
        <ErrorState description={error} onRetry={retry} />
      ) : data ? (
        <div className="space-y-6">
          <section
            aria-label="Dashboard overview"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
          >
            <DashboardStatCard
              detail="Across every application stage"
              icon={BriefcaseBusiness}
              label="Total applications"
              value={data.stats.total_applications}
            />
            <DashboardStatCard
              detail="Wishlist, applied, assessment, or interview"
              icon={Layers3}
              label="Active applications"
              value={data.stats.active_applications}
            />
            <DashboardStatCard
              detail="Future interviews without an outcome"
              icon={CalendarClock}
              label="Interviews scheduled"
              value={data.stats.interviews_scheduled}
            />
            <DashboardStatCard
              detail="Applications currently at offer"
              icon={BadgeCheck}
              label="Offers received"
              value={data.stats.offers_received}
            />
            <DashboardStatCard
              detail="Applications currently rejected"
              icon={CircleX}
              label="Rejections"
              value={data.stats.rejections}
            />
          </section>

          <Suspense fallback={<LoadingState label="Loading charts" />}>
            <DashboardCharts data={data} />
          </Suspense>
          <DashboardLists data={data} />
        </div>
      ) : null}
    </>
  )
}
