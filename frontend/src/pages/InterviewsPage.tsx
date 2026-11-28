import { CalendarDays, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { useToast } from '../components/feedback/useToast'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FormField, Input, Select, Textarea } from '../components/ui/FormField'
import { ApiError, apiClient } from '../lib/api/client'
import { fetchAllApplications, type ApiResponse, type JobApplication } from '../lib/api/applications'
import {
  fetchInterviews,
  localDateTimeToIso,
  toLocalDateTimeInput,
  type Interview,
  type InterviewPayload,
  type InterviewType,
} from '../lib/api/resources'

interface InterviewValues {
  application_id: string
  scheduled_at: string
  interview_type: InterviewType
  notes: string
  outcome: string
}

const interviewTypes: InterviewType[] = ['HR', 'Technical', 'Managerial', 'Other']
const blankValues: InterviewValues = {
  application_id: '',
  scheduled_at: '',
  interview_type: 'HR',
  notes: '',
  outcome: '',
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'The interview request could not be completed. Please try again.'
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function InterviewsPage() {
  const { showToast } = useToast()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [values, setValues] = useState<InterviewValues>(blankValues)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loadedReloadKey, setLoadedReloadKey] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isLoading = loadedReloadKey !== reloadKey
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    Promise.all([
      fetchInterviews(controller.signal),
      fetchAllApplications(controller.signal),
    ])
      .then(([interviewRecords, applicationRecords]) => {
        if (!active) return
        setInterviews(interviewRecords)
        setApplications(applicationRecords)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) setError(messageFor(cause))
      })
      .finally(() => {
        if (active) setLoadedReloadKey(reloadKey)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [reloadKey])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const applicationsById = useMemo(
    () => new Map(applications.map((application) => [application.id, application])),
    [applications],
  )
  const upcoming = interviews.filter((interview) => new Date(interview.scheduled_at).getTime() >= now)
  const past = interviews.filter((interview) => new Date(interview.scheduled_at).getTime() < now)

  function openCreateForm() {
    setEditingId(null)
    setValues({
      ...blankValues,
      application_id: applications.length === 1 ? applications[0].id : '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditForm(interview: Interview) {
    setEditingId(interview.id)
    setValues({
      application_id: interview.application_id,
      scheduled_at: toLocalDateTimeInput(interview.scheduled_at),
      interview_type: interviewTypes.find((type) => type === interview.interview_type) ?? 'Other',
      notes: interview.notes ?? '',
      outcome: interview.outcome ?? '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function updateField<K extends keyof InterviewValues>(key: K, value: InterviewValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFormError(null)
  }

  function chooseInterviewType(value: string) {
    const type = interviewTypes.find((candidate) => candidate === value)
    if (type) updateField('interview_type', type)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const scheduledAt = localDateTimeToIso(values.scheduled_at)
    if (!values.application_id || !scheduledAt) {
      setFormError('Choose an application and a valid interview date and time.')
      return
    }
    const payload: InterviewPayload = {
      application_id: values.application_id,
      scheduled_at: scheduledAt,
      interview_type: values.interview_type,
      notes: values.notes.trim() || null,
      outcome: values.outcome.trim() || null,
    }
    setIsSaving(true)
    setFormError(null)
    try {
      const response = editingId
        ? await apiClient.put<ApiResponse<Interview>>(`/api/interviews/${editingId}`, payload)
        : await apiClient.post<ApiResponse<Interview>>('/api/interviews', payload)
      setInterviews((current) => {
        const next = editingId
          ? current.map((item) => item.id === editingId ? response.data : item)
          : [...current, response.data]
        return next.sort((left, right) => left.scheduled_at.localeCompare(right.scheduled_at))
      })
      showToast({
        title: editingId ? 'Interview updated' : 'Interview scheduled',
        description: `Saved for ${applicationsById.get(response.data.application_id)?.job_title ?? 'your application'}.`,
        tone: 'success',
      })
      setIsFormOpen(false)
      setEditingId(null)
      setValues(blankValues)
    } catch (cause) {
      setFormError(messageFor(cause))
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteInterview() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(
        `/api/interviews/${deleteTarget.id}`,
      )
      setInterviews((current) => current.filter((interview) => interview.id !== deleteTarget.id))
      showToast({ title: 'Interview deleted', description: 'The interview was removed.', tone: 'success' })
      setDeleteTarget(null)
    } catch (cause) {
      showToast({ title: 'Could not delete interview', description: messageFor(cause), tone: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  function renderInterview(interview: Interview) {
    const application = applicationsById.get(interview.application_id)
    return (
      <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between" key={interview.id}>
        <div className="flex min-w-0 gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={new Date(interview.scheduled_at).getTime() >= now ? 'info' : 'neutral'}>
                {interview.interview_type}
              </Badge>
              <span className="text-sm font-medium text-foreground">{dateTime(interview.scheduled_at)}</span>
            </div>
            {application ? (
              <Link className="mt-2 block truncate text-sm font-medium text-primary hover:underline" to={`/applications/${application.id}`}>
                {application.job_title} · {application.company.name}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Linked application is no longer available.</p>
            )}
            {interview.outcome ? <p className="mt-2 text-sm text-muted-foreground">Outcome: {interview.outcome}</p> : null}
            {interview.notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{interview.notes}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:justify-end">
          <Button aria-label="Edit interview" onClick={() => openEditForm(interview)} size="icon" variant="outline"><Pencil aria-hidden="true" className="size-4" /></Button>
          <Button aria-label="Delete interview" onClick={() => setDeleteTarget(interview)} size="icon" variant="outline"><Trash2 aria-hidden="true" className="size-4 text-danger" /></Button>
        </div>
      </li>
    )
  }

  return (
    <>
      <PageHeader
        actions={
          <Button disabled={applications.length === 0} onClick={openCreateForm}>
            <Plus aria-hidden="true" className="size-4" /> Schedule interview
          </Button>
        }
        description="Keep upcoming conversations, preparation notes, and outcomes connected to each role."
        eyebrow="Your schedule"
        title="Interviews"
      />

      {isFormOpen ? (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{editingId ? 'Edit interview' : 'Schedule an interview'}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Date and time are interpreted in your browser’s local time zone.</p>
              </div>
              <Button aria-label="Close interview form" onClick={() => setIsFormOpen(false)} size="icon" variant="ghost"><X aria-hidden="true" className="size-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(event) => void submit(event)}>
              <FormField htmlFor="interview-application" label="Application *">
                <Select id="interview-application" onChange={(event) => updateField('application_id', event.target.value)} required value={values.application_id}>
                  <option value="">Select an application</option>
                  {applications.map((application) => <option key={application.id} value={application.id}>{application.job_title} — {application.company.name}</option>)}
                </Select>
              </FormField>
              <FormField htmlFor="interview-time" label="Date and time *">
                <Input id="interview-time" onChange={(event) => updateField('scheduled_at', event.target.value)} required type="datetime-local" value={values.scheduled_at} />
              </FormField>
              <FormField htmlFor="interview-type" label="Interview type *">
                <Select id="interview-type" onChange={(event) => chooseInterviewType(event.target.value)} value={values.interview_type}>
                  {interviewTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </Select>
              </FormField>
              <FormField htmlFor="interview-outcome" label="Outcome">
                <Input id="interview-outcome" maxLength={80} onChange={(event) => updateField('outcome', event.target.value)} placeholder="e.g. Awaiting feedback" value={values.outcome} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField htmlFor="interview-notes" label="Notes">
                  <Textarea id="interview-notes" onChange={(event) => updateField('notes', event.target.value)} value={values.notes} />
                </FormField>
              </div>
              {formError ? <p className="text-sm text-danger sm:col-span-2" role="alert">{formError}</p> : null}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button disabled={isSaving} onClick={() => setIsFormOpen(false)} variant="outline">Cancel</Button>
                <Button disabled={isSaving} type="submit">{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Schedule interview'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card><CardContent className="pt-4"><LoadingState label="Loading interviews" /></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="pt-4"><ErrorState description={error} onRetry={() => setReloadKey((key) => key + 1)} /></CardContent></Card>
      ) : applications.length === 0 && interviews.length === 0 ? (
        <Card><CardContent className="pt-3"><EmptyState description="Add an application before scheduling its interviews." icon={<CalendarDays aria-hidden="true" className="size-5" />} title="No applications to schedule" /></CardContent></Card>
      ) : interviews.length === 0 ? (
        <Card><CardContent className="pt-3"><EmptyState actionLabel="Schedule an interview" description="Interview dates, notes, and outcomes will appear here." icon={<CalendarDays aria-hidden="true" className="size-5" />} onAction={openCreateForm} title="No interviews yet" /></CardContent></Card>
      ) : (
        <div className="grid gap-5">
          {[
            { title: 'Upcoming', records: upcoming, empty: 'No upcoming interviews scheduled.' },
            { title: 'Past', records: past, empty: 'Past interviews will appear here after their scheduled time.' },
          ].map(({ title, records, empty }) => (
            <Card key={title}>
              <CardHeader><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">{title}</h2><Badge>{records.length}</Badge></div></CardHeader>
              {records.length ? <ul className="divide-y divide-border">{records.map(renderInterview)}</ul> : <CardContent><p className="text-sm text-muted-foreground">{empty}</p></CardContent>}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Delete interview"
        description="This removes the interview record. If its application is deleted, associated interviews are removed with it."
        isWorking={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void deleteInterview()}
        open={Boolean(deleteTarget)}
        title="Delete this interview?"
      />
    </>
  )
}
