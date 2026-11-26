import { Card, CardContent } from '../components/ui/Card'
import { EmptyState } from '../components/feedback/StatePanel'
import { PageHeader } from '../components/layout/PageHeader'
import type { ResourcePageDefinition } from './resourcePages'

export function ResourcePage({ page }: { page: ResourcePageDefinition }) {
  const Icon = page.icon

  return (
    <>
      <PageHeader description={page.description} title={page.title} />
      <Card>
        <CardContent className="pt-3">
          <EmptyState
            description={page.emptyDescription}
            icon={<Icon aria-hidden="true" className="size-5" />}
            title={page.emptyTitle}
          />
        </CardContent>
      </Card>
    </>
  )
}
