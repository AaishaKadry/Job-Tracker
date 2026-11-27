import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { useToast } from '../components/feedback/useToast'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { buttonVariants } from '../components/ui/buttonVariants'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Select } from '../components/ui/FormField'
import { ApiError, apiClient } from '../lib/api/client'
import {
  applicationStatuses,
  fetchApplication,
  statusLabels,
  type ApplicationStatus,
  type ApiResponse,
  type JobApplication,
} from '../lib/api/applications'
import { cn } from '../lib/utils'

function statusTone(status: ApplicationStatus) {
  if (status === 'offer') return 'success'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  if (status === 'interview' || status === 'assessment') return 'warning'
  if (status === 'applied') return 'info'
  return 'neutral'
}

function formatDate(value: string | null): string {
  if (!value) return 'Not provided'
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatSalary(application: JobApplication): string {
  const amounts = [application.salary_min, application.salary_max]
    .filter((amount): amount is string => amount !== null)
    .map((amount) =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
      }).format(Number(amount)),
    )
  if (!amounts.length) return 'Not provided'
  return `${application.salary_currency ?? ''} ${amounts.join(' – ')}`.trim()
}

function formatLabel(value: string | null): string {
  if (!value) return 'Not specified'
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'The request could not be completed. Please try again.'
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 break-words text-sm text-foreground">{children}</dd>
    </div>
  )
}

export function ApplicationDetailPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [application, setApplication] = useState<JobApplication | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('')
  const [reloadKey, setReloadKey] = useState(0)
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<{
    key: string
    message: string
  } | null>(null)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const requestKey = `${applicationId ?? 'missing'}:${reloadKey}`

  const loadApplication = useCallback(
    async (signal: AbortSignal) => {
      if (!applicationId) throw new Error('Application ID is missing.')
      return fetchApplication(applicationId, signal)
    },
    [applicationId],
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void loadApplication(controller.signal)
      .then((record) => {
        if (!active) return
        setApplication(record)
        setSelectedStatus(record.status)
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
  }, [loadApplication, requestKey])

  const isLoading = loadedRequestKey !== requestKey
  const loadError = requestError?.key === requestKey ? requestError.message : null

  async function saveStatus() {
    if (!application || !selectedStatus || selectedStatus === application.status) return
    setIsSavingStatus(true)
    try {
      const response = await apiClient.patch<ApiResponse<JobApplication>>(
        `/api/applications/${application.id}/status`,
        { status: selectedStatus },
      )
      setApplication(response.data)
      setSelectedStatus(response.data.status)
      showToast({
        title: 'Status updated',
        description: `This application is now ${statusLabels[response.data.status]}.`,
        tone: 'success',
      })
    } catch (error) {
      setSelectedStatus(application.status)
      showToast({
        title: 'Could not update status',
        description: errorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function deleteApplication() {
    if (!application) return
    setIsDeleting(true)
    try {
      await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(
        `/api/applications/${application.id}`,
      )
      showToast({
        title: 'Application deleted',
        description: `${application.job_title} at ${application.company.name} was removed.`,
        tone: 'success',
      })
      navigate('/applications', { replace: true })
    } catch (error) {
      showToast({
        title: 'Could not delete application',
        description: errorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading application details" />

  if (loadError || !application) {
    return (
      <>
        <PageHeader
          description="The application could not be loaded."
          title="Application details"
        />
        <Card>
          <CardContent className="pt-4">
            <ErrorState
              description={loadError ?? 'Application not found.'}
              onRetry={() => setReloadKey((current) => current + 1)}
            />
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <Link
              className={cn(buttonVariants({ variant: 'outline' }))}
              to="/applications"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">All applications</span>
            </Link>
            <Button
              onClick={() => navigate(`/applications/${application.id}/edit`)}
              variant="outline"
            >
              <Pencil aria-hidden="true" className="size-4" />
              Edit
            </Button>
            <Button
              aria-label="Delete application"
              onClick={() => setIsDeleteOpen(true)}
              size="icon"
              variant="outline"
            >
              <Trash2 aria-hidden="true" className="size-4 text-danger" />
            </Button>
          </>
        }
        description={application.company.name}
        eyebrow="Application"
        title={application.job_title}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(application.status)}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {statusLabels[application.status]}
                </Badge>
                <Badge>{formatLabel(application.employment_type)}</Badge>
                <Badge>{formatLabel(application.work_arrangement)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                <DetailItem label="Company">{application.company.name}</DetailItem>
                <DetailItem label="Location">
                  {application.location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      {application.location}
                    </span>
                  ) : (
                    'Not provided'
                  )}
                </DetailItem>
                <DetailItem label="Application date">
                  {formatDate(application.application_date)}
                </DetailItem>
                <DetailItem label="Salary range">{formatSalary(application)}</DetailItem>
                <DetailItem label="Job posting">
                  {application.job_url ? (
                    <a
                      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                      href={application.job_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open job posting
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </DetailItem>
                <DetailItem label="Last updated">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(application.updated_at))}
                </DetailItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-foreground">Job description</h2>
            </CardHeader>
            <CardContent>
              {application.job_description ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {application.job_description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No job description has been added.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-foreground">Notes</h2>
            </CardHeader>
            <CardContent>
              {application.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {application.notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes have been added.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-foreground">Update progress</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                A status change is recorded in your application history.
              </p>
            </CardHeader>
            <CardContent>
              <label
                className="mb-2 block text-xs font-medium text-muted-foreground"
                htmlFor="detail-status"
              >
                Current status
              </label>
              <div className="grid gap-2">
                <Select
                  id="detail-status"
                  onChange={(event) => {
                    const selected = applicationStatuses.find(
                      (status) => status === event.target.value,
                    )
                    if (selected) setSelectedStatus(selected)
                  }}
                  value={selectedStatus}
                >
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </Select>
                <Button
                  disabled={
                    isSavingStatus ||
                    !selectedStatus ||
                    selectedStatus === application.status
                  }
                  onClick={() => void saveStatus()}
                >
                  {isSavingStatus ? 'Saving status…' : 'Save status'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-foreground">Recruiter</h2>
            </CardHeader>
            <CardContent>
              {application.recruiter_name || application.recruiter_email ? (
                <dl className="grid gap-4">
                  {application.recruiter_name ? (
                    <DetailItem label="Name">{application.recruiter_name}</DetailItem>
                  ) : null}
                  {application.recruiter_email ? (
                    <DetailItem label="Email">
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href={`mailto:${application.recruiter_email}`}
                      >
                        {application.recruiter_email}
                      </a>
                    </DetailItem>
                  ) : null}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recruiter details have been added.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-primary" />
            Saved to your JobTrack workspace
          </div>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Delete application"
        description={`This will permanently delete ${application.job_title} at ${application.company.name}, including its related interviews, reminders, and status history. This cannot be undone.`}
        isWorking={isDeleting}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => void deleteApplication()}
        open={isDeleteOpen}
        title="Delete this application?"
      />
    </>
  )
}
