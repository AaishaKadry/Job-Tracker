import { Building2, ExternalLink, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { PageHeader } from '../components/layout/PageHeader'
import { buttonVariants } from '../components/ui/buttonVariants'
import { Card, CardContent } from '../components/ui/Card'
import { ApiError } from '../lib/api/client'
import { fetchAllApplications, fetchCompanies, type Company } from '../lib/api/applications'
import { cn } from '../lib/utils'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Unable to load companies. Please try again.'
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({})
  const [loadedReloadKey, setLoadedReloadKey] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const isLoading = loadedReloadKey !== reloadKey

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    Promise.all([
      fetchCompanies(controller.signal),
      fetchAllApplications(controller.signal),
    ])
      .then(([companyRecords, applications]) => {
        if (!active) return
        setCompanies(companyRecords)
        setApplicationCounts(
          applications.reduce<Record<string, number>>((counts, application) => {
            counts[application.company.id] = (counts[application.company.id] ?? 0) + 1
            return counts
          }, {}),
        )
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) setError(errorMessage(cause))
      })
      .finally(() => {
        if (active) setLoadedReloadKey(reloadKey)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [reloadKey])

  return (
    <>
      <PageHeader
        actions={
          <Link className={cn(buttonVariants())} to="/companies/new">
            <Plus aria-hidden="true" className="size-4" />
            Add company
          </Link>
        }
        description="Save company details once and keep them connected to every opportunity."
        eyebrow="Your network"
        title="Companies"
      />
      {isLoading ? (
        <Card><CardContent className="pt-4"><LoadingState label="Loading companies" /></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="pt-4"><ErrorState description={error} onRetry={() => setReloadKey((key) => key + 1)} /></CardContent></Card>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="pt-3">
            <EmptyState
              actionLabel="Add your first company"
              description="Company details can be reused across applications and help keep your search organized."
              icon={<Building2 aria-hidden="true" className="size-5" />}
              onAction={() => navigate('/companies/new')}
              title="No companies yet"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <Card className="flex min-w-0 flex-col" key={company.id}>
              <CardContent className="flex flex-1 flex-col pt-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Building2 aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-semibold text-foreground hover:text-primary"
                      to={`/companies/${company.id}`}
                    >
                      {company.name}
                    </Link>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {[company.industry, company.location].filter(Boolean).join(' · ') || 'Company details'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {applicationCounts[company.id] ?? 0} applications
                  </span>
                  {company.website ? (
                    <a
                      aria-label={`Visit ${company.name} website`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      href={company.website}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Website <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  ) : (
                    <Link className="text-sm font-medium text-primary hover:underline" to={`/companies/${company.id}`}>
                      View details
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
