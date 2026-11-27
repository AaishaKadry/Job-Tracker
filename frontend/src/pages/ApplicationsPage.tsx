import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { buttonVariants } from '../components/ui/buttonVariants'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/FormField'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table'
import { apiClient, ApiError } from '../lib/api/client'
import { cn } from '../lib/utils'
import {
  applicationStatuses,
  statusLabels,
  type ApplicationStatus,
  type PaginatedApplications,
} from '../lib/api/applications'

type SortBy = 'application_date' | 'updated_at'
type SortOrder = 'asc' | 'desc'

function statusTone(status: ApplicationStatus) {
  if (status === 'offer') return 'success'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  if (status === 'interview' || status === 'assessment') return 'warning'
  if (status === 'applied') return 'info'
  return 'neutral'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

function formatSalary(
  minimum: string | null,
  maximum: string | null,
  currency: string | null,
): string {
  if (minimum === null && maximum === null) return '—'
  const amounts = [minimum, maximum]
    .filter((amount): amount is string => amount !== null)
    .map((amount) =>
      new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
        Number(amount),
      ),
    )
  return `${currency ?? ''} ${amounts.join(' – ')}`.trim()
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Unable to load applications. Please try again.'
}

export function ApplicationsPage() {
  const [applications, setApplications] = useState<PaginatedApplications['data']>([])
  const [pagination, setPagination] =
    useState<PaginatedApplications['pagination'] | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('')
  const [sortBy, setSortBy] = useState<SortBy>('application_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<{
    key: string
    message: string
  } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const requestKey = [
    page,
    search,
    selectedStatus,
    sortBy,
    sortOrder,
    reloadKey,
  ].join('|')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadApplications = useCallback(
    async (signal: AbortSignal) => {
      const query = new URLSearchParams({
        page: String(page),
        page_size: '10',
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      if (search) query.set('q', search)
      if (selectedStatus) query.set('status', selectedStatus)

      return apiClient.get<PaginatedApplications>(
        `/api/applications?${query.toString()}`,
        { signal },
      )
    },
    [page, search, selectedStatus, sortBy, sortOrder],
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void loadApplications(controller.signal)
      .then((response) => {
        if (!active) return
        setApplications(response.data)
        setPagination(response.pagination)
        setRequestError(null)
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) {
          setRequestError({ key: requestKey, message: errorMessage(cause) })
        }
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [loadApplications, requestKey])

  const isLoading = loadedRequestKey !== requestKey
  const error = requestError?.key === requestKey ? requestError.message : null

  function changeStatus(value: string) {
    const status = applicationStatuses.find((item) => item === value)
    setSelectedStatus(status ?? '')
    setPage(1)
  }

  function changeSort(value: string) {
    if (value === 'application_date' || value === 'updated_at') {
      setSortBy(value)
      setPage(1)
    }
  }

  function toggleSortOrder() {
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
    setPage(1)
  }

  return (
    <>
      <PageHeader
        actions={
          <Link className={cn(buttonVariants())} to="/applications/new">
            <Plus aria-hidden="true" className="size-4" />
            Add application
          </Link>
        }
        description="Keep every opportunity, its current stage, and the details you need to follow up."
        eyebrow="Your job search"
        title="Applications"
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search applications"
              className="pl-9"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search role or company…"
              type="search"
              value={searchInput}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
            <Select
              aria-label="Filter by status"
              onChange={(event) => changeStatus(event.target.value)}
              value={selectedStatus}
            >
              <option value="">All statuses</option>
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Sort applications by"
              onChange={(event) => changeSort(event.target.value)}
              value={sortBy}
            >
              <option value="application_date">Application date</option>
              <option value="updated_at">Last updated</option>
            </Select>
            <Button
              aria-label={`Sort ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
              className="col-span-2 sm:col-span-1"
              onClick={toggleSortOrder}
              size="icon"
              title={`Currently ${sortOrder === 'desc' ? 'newest first' : 'oldest first'}`}
              variant="outline"
            >
              {sortOrder === 'desc' ? (
                <ArrowDown aria-hidden="true" className="size-4" />
              ) : (
                <ArrowUp aria-hidden="true" className="size-4" />
              )}
              <ArrowUpDown aria-hidden="true" className="sr-only" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Loading your applications" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={() => setReloadKey((current) => current + 1)}
          />
        ) : applications.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-8">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <Search aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-foreground">
              {search || selectedStatus
                ? 'No matching applications'
                : 'Start with your first opportunity'}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
              {search || selectedStatus
                ? 'Try another search or clear the selected status filter.'
                : 'Save a role and company to keep the details and next steps together.'}
            </p>
            {search || selectedStatus ? (
              <Button
                className="mt-5"
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                  setSelectedStatus('')
                }}
                variant="outline"
              >
                Clear filters
              </Button>
            ) : (
              <Link
                className={cn(buttonVariants(), 'mt-5')}
                to="/applications/new"
              >
                <Plus aria-hidden="true" className="size-4" />
                Add application
              </Link>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Salary range</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="pr-5 text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="min-w-[190px] pl-5">
                      <Link
                        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                        to={`/applications/${application.id}`}
                      >
                        {application.job_title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {application.employment_type
                          ? application.employment_type.replace('-', ' ')
                          : 'Role'}
                        {application.work_arrangement
                          ? ` · ${application.work_arrangement}`
                          : ''}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-[150px] font-medium text-foreground">
                      {application.company.name}
                    </TableCell>
                    <TableCell>
                      <Badge tone={statusTone(application.status)}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {statusLabels[application.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[130px] text-muted-foreground">
                      {application.location || '—'}
                    </TableCell>
                    <TableCell className="min-w-[140px] whitespace-nowrap text-muted-foreground">
                      {formatSalary(
                        application.salary_min,
                        application.salary_max,
                        application.salary_currency,
                      )}
                    </TableCell>
                    <TableCell className="min-w-[120px] text-muted-foreground">
                      {formatDate(application.application_date)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Link
                        className={cn(
                          buttonVariants({ size: 'sm', variant: 'ghost' }),
                        )}
                        to={`/applications/${application.id}`}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-muted-foreground">
                {pagination
                  ? `Showing ${(page - 1) * 10 + 1}–${Math.min(
                      page * 10,
                      pagination.total,
                    )} of ${pagination.total} applications`
                  : ' '}
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="mr-2 text-xs text-muted-foreground">
                  Page {pagination?.page ?? page} of {pagination?.pages ?? 1}
                </span>
                <Button
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  size="icon"
                  variant="outline"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label="Next page"
                  disabled={!pagination || page >= pagination.pages}
                  onClick={() =>
                    setPage((current) =>
                      pagination ? Math.min(pagination.pages, current + 1) : current,
                    )
                  }
                  size="icon"
                  variant="outline"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  )
}
