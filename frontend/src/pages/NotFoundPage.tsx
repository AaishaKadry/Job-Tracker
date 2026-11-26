import { Link } from 'react-router-dom'
import { EmptyState } from '../components/feedback/StatePanel'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardContent } from '../components/ui/Card'

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        description="We couldn't find the page you were looking for."
        title="Page not found"
      />
      <Card>
        <CardContent className="pt-3">
          <EmptyState
            description="Check the address or return to your dashboard."
            title="This page isn't here"
          />
          <div className="pb-6 text-center">
            <Link
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              to="/"
            >
              Back to dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
