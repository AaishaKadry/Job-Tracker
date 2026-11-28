import { ArrowLeft, ExternalLink, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { useToast } from '../components/feedback/useToast'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { buttonVariants } from '../components/ui/buttonVariants'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ApiError, apiClient } from '../lib/api/client'
import { fetchAllApplications, type ApiResponse, type Company, type JobApplication } from '../lib/api/applications'
import { fetchCompany } from '../lib/api/resources'
import { cn } from '../lib/utils'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'The request could not be completed. Please try again.'
}

function formatDate(value: string | null): string {
  if (!value) return 'Date not provided'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

export function CompanyDetailPage() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [company, setCompany] = useState<Company | null>(null)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const requestKey = `${companyId ?? 'missing'}:${reloadKey}`
  const isLoading = loadedRequestKey !== requestKey

  useEffect(() => {
    if (!companyId) return
    const controller = new AbortController()
    let active = true
    Promise.all([
      fetchCompany(companyId, controller.signal),
      fetchAllApplications(controller.signal),
    ])
      .then(([record, allApplications]) => {
        if (!active) return
        setCompany(record)
        setApplications(allApplications.filter((application) => application.company.id === record.id))
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) setError(messageFor(cause))
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [companyId, reloadKey, requestKey])

  async function deleteCompany() {
    if (!company) return
    setIsDeleting(true)
    try {
      await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(
        `/api/companies/${company.id}`,
      )
      showToast({
        title: 'Company deleted',
        description: `${company.name} was removed.`,
        tone: 'success',
      })
      navigate('/companies', { replace: true })
    } catch (cause) {
      showToast({
        title: 'Could not delete company',
        description: messageFor(cause),
        tone: 'error',
      })
      setIsDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading company details" />
  if (error || !company) {
    return (
      <>
        <PageHeader description="The company could not be loaded." title="Company details" />
        <Card>
          <CardContent className="pt-4">
            <ErrorState
              description={error ?? 'Company not found.'}
              onRetry={() => setReloadKey((key) => key + 1)}
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
            <Link className={cn(buttonVariants({ variant: 'outline' }))} to="/companies">
              <ArrowLeft aria-hidden="true" className="size-4" /> Companies
            </Link>
            <Link className={cn(buttonVariants({ variant: 'outline' }))} to={`/companies/${company.id}/edit`}>
              <Pencil aria-hidden="true" className="size-4" /> Edit
            </Link>
            <Button aria-label="Delete company" onClick={() => setIsDeleteOpen(true)} size="icon" variant="outline">
              <Trash2 aria-hidden="true" className="size-4 text-danger" />
            </Button>
          </>
        }
        description={[company.industry, company.location].filter(Boolean).join(' · ') || 'Company information and associated opportunities.'}
        eyebrow="Company"
        title={company.name}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Applications</h2>
              <Badge>{applications.length} tracked</Badge>
            </div>
          </CardHeader>
          {applications.length === 0 ? (
            <CardContent>
              <p className="text-sm text-muted-foreground">No applications are linked to this company yet.</p>
            </CardContent>
          ) : (
            <ul className="divide-y divide-border">
              {applications.map((application) => (
                <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" key={application.id}>
                  <div className="min-w-0">
                    <Link className="font-medium text-foreground hover:text-primary" to={`/applications/${application.id}`}>
                      {application.job_title}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {application.location ? <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="size-3" />{application.location}</span> : null}
                      <span>Applied {formatDate(application.application_date)}</span>
                    </p>
                  </div>
                  <Badge>{application.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-foreground">Company details</h2></CardHeader>
          <CardContent className="grid gap-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Website</p>
              {company.website ? (
                <a className="mt-1 inline-flex items-center gap-1.5 break-all text-sm text-primary hover:underline" href={company.website} rel="noreferrer" target="_blank">
                  {company.website}<ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                </a>
              ) : <p className="mt-1 text-sm text-muted-foreground">Not provided</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Industry</p>
              <p className="mt-1 text-sm">{company.industry || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Location</p>
              <p className="mt-1 text-sm">{company.location || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{company.notes || 'No notes added.'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        confirmLabel="Delete company"
        confirmDisabled={applications.length > 0}
        description={
          applications.length
            ? `This company is linked to ${applications.length} application${applications.length === 1 ? '' : 's'}. The API will prevent deletion until those applications are reassigned or removed.`
            : 'This removes the company record. This action cannot be undone.'
        }
        isWorking={isDeleting}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => void deleteCompany()}
        open={isDeleteOpen}
        title={`Delete ${company.name}?`}
      />
    </>
  )
}
