import { lazy, Suspense } from 'react'
import { ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { PageHeader } from '../components/layout/PageHeader'
import { useDashboardData } from '../hooks/useDashboardData'

const DashboardCharts = lazy(() =>
  import('../components/dashboard/DashboardCharts').then((module) => ({
    default: module.DashboardCharts,
  })),
)

export function AnalyticsPage() {
  const { data, error, isLoading, retry } = useDashboardData()

  return (
    <>
      <PageHeader
        description="Understand your application pipeline and see how opportunities move toward interviews and offers."
        eyebrow="Your progress"
        title="Analytics"
      />
      {isLoading ? (
        <LoadingState label="Loading your analytics" />
      ) : error ? (
        <ErrorState description={error} onRetry={retry} />
      ) : data ? (
        <Suspense fallback={<LoadingState label="Loading charts" />}>
          <DashboardCharts data={data} />
        </Suspense>
      ) : null}
    </>
  )
}
