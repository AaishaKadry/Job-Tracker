import { Bell, Check, Clock3, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
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
  fetchReminders,
  localDateTimeToIso,
  toLocalDateTimeInput,
  type Reminder,
  type ReminderPayload,
  type ReminderUpdatePayload,
} from '../lib/api/resources'

interface ReminderValues {
  application_id: string
  due_at: string
  note: string
}

const blankValues: ReminderValues = { application_id: '', due_at: '', note: '' }

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'The reminder request could not be completed. Please try again.'
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function RemindersPage() {
  const { showToast } = useToast()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [values, setValues] = useState<ReminderValues>(blankValues)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loadedReloadKey, setLoadedReloadKey] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isLoading = loadedReloadKey !== reloadKey
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    Promise.all([
      fetchReminders(controller.signal),
      fetchAllApplications(controller.signal),
    ])
      .then(([reminderRecords, applicationRecords]) => {
        if (!active) return
        setReminders(reminderRecords)
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
  const overdue = reminders.filter((reminder) => !reminder.is_completed && new Date(reminder.due_at).getTime() < now)
  const upcoming = reminders.filter((reminder) => !reminder.is_completed && new Date(reminder.due_at).getTime() >= now)
  const completed = reminders.filter((reminder) => reminder.is_completed)

  function openCreateForm() {
    setEditingId(null)
    setValues({
      ...blankValues,
      application_id: applications.length === 1 ? applications[0].id : '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditForm(reminder: Reminder) {
    setEditingId(reminder.id)
    setValues({
      application_id: reminder.application_id,
      due_at: toLocalDateTimeInput(reminder.due_at),
      note: reminder.note ?? '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function updateField<K extends keyof ReminderValues>(key: K, value: ReminderValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFormError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dueAt = localDateTimeToIso(values.due_at)
    if ((!editingId && !values.application_id) || !dueAt) {
      setFormError('Choose an application and a valid reminder date and time.')
      return
    }
    setIsSaving(true)
    setFormError(null)
    try {
      const response = editingId
        ? await apiClient.patch<ApiResponse<Reminder>>(
            `/api/reminders/${editingId}`,
            { due_at: dueAt, note: values.note.trim() || null } satisfies ReminderUpdatePayload,
          )
        : await apiClient.post<ApiResponse<Reminder>>('/api/reminders', {
            application_id: values.application_id,
            due_at: dueAt,
            note: values.note.trim() || null,
          } satisfies ReminderPayload)
      setReminders((current) => {
        const next = editingId
          ? current.map((item) => item.id === editingId ? response.data : item)
          : [...current, response.data]
        return next.sort((left, right) => left.due_at.localeCompare(right.due_at))
      })
      showToast({
        title: editingId ? 'Reminder updated' : 'Reminder created',
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

  async function setCompleted(reminder: Reminder, isCompleted: boolean) {
    setPendingId(reminder.id)
    try {
      const response = await apiClient.patch<ApiResponse<Reminder>>(
        `/api/reminders/${reminder.id}`,
        { is_completed: isCompleted } satisfies ReminderUpdatePayload,
      )
      setReminders((current) => current.map((item) => item.id === reminder.id ? response.data : item))
      showToast({
        title: isCompleted ? 'Reminder completed' : 'Reminder reopened',
        description: applicationsById.get(reminder.application_id)?.job_title ?? 'Reminder status saved.',
        tone: 'success',
      })
    } catch (cause) {
      showToast({ title: 'Could not update reminder', description: messageFor(cause), tone: 'error' })
    } finally {
      setPendingId(null)
    }
  }

  async function deleteReminder() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(
        `/api/reminders/${deleteTarget.id}`,
      )
      setReminders((current) => current.filter((reminder) => reminder.id !== deleteTarget.id))
      showToast({ title: 'Reminder deleted', description: 'The reminder was removed.', tone: 'success' })
      setDeleteTarget(null)
    } catch (cause) {
      showToast({ title: 'Could not delete reminder', description: messageFor(cause), tone: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  function renderReminder(reminder: Reminder) {
    const application = applicationsById.get(reminder.application_id)
    const isOverdue = !reminder.is_completed && new Date(reminder.due_at).getTime() < now
    const isPending = pendingId === reminder.id
    return (
      <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between" key={reminder.id}>
        <div className="flex min-w-0 gap-3">
          <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${isOverdue ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
            <Clock3 aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={reminder.is_completed ? 'success' : isOverdue ? 'danger' : 'info'}>
                {reminder.is_completed ? 'Completed' : isOverdue ? 'Overdue' : 'Upcoming'}
              </Badge>
              <span className="text-sm font-medium text-foreground">{dateTime(reminder.due_at)}</span>
            </div>
            {application ? (
              <Link className="mt-2 block truncate text-sm font-medium text-primary hover:underline" to={`/applications/${application.id}`}>
                {application.job_title} · {application.company.name}
              </Link>
            ) : <p className="mt-2 text-sm text-muted-foreground">Linked application is no longer available.</p>}
            {reminder.note ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{reminder.note}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button disabled={isPending} onClick={() => void setCompleted(reminder, !reminder.is_completed)} size="sm" variant={reminder.is_completed ? 'outline' : 'secondary'}>
            {reminder.is_completed ? <RotateCcw aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4" />}
            {reminder.is_completed ? 'Reopen' : 'Complete'}
          </Button>
          <Button aria-label="Edit reminder" onClick={() => openEditForm(reminder)} size="icon" variant="outline"><Pencil aria-hidden="true" className="size-4" /></Button>
          <Button aria-label="Delete reminder" onClick={() => setDeleteTarget(reminder)} size="icon" variant="outline"><Trash2 aria-hidden="true" className="size-4 text-danger" /></Button>
        </div>
      </li>
    )
  }

  const sections = [
    { title: 'Overdue', records: overdue, empty: 'Nothing overdue. Nice work staying on top of follow-ups.', tone: 'danger' as const },
    { title: 'Upcoming', records: upcoming, empty: 'Upcoming follow-ups will appear here.', tone: 'info' as const },
    { title: 'Completed', records: completed, empty: 'Completed reminders will appear here.', tone: 'success' as const },
  ]

  return (
    <>
      <PageHeader
        actions={<Button disabled={applications.length === 0} onClick={openCreateForm}><Plus aria-hidden="true" className="size-4" /> Add reminder</Button>}
        description="Make your next action visible, then mark it done when you follow up."
        eyebrow="Your next steps"
        title="Reminders"
      />

      {isFormOpen ? (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{editingId ? 'Edit reminder' : 'Create a follow-up'}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Date and time are interpreted in your browser’s local time zone.</p>
              </div>
              <Button aria-label="Close reminder form" onClick={() => setIsFormOpen(false)} size="icon" variant="ghost"><X aria-hidden="true" className="size-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(event) => void submit(event)}>
              <FormField htmlFor="reminder-application" label="Application *">
                {editingId ? (
                  <Input disabled id="reminder-application" value={applicationsById.get(values.application_id)?.job_title ?? 'Linked application'} />
                ) : (
                  <Select id="reminder-application" onChange={(event) => updateField('application_id', event.target.value)} required value={values.application_id}>
                    <option value="">Select an application</option>
                    {applications.map((application) => <option key={application.id} value={application.id}>{application.job_title} — {application.company.name}</option>)}
                  </Select>
                )}
              </FormField>
              <FormField htmlFor="reminder-due-at" label="Due date and time *">
                <Input id="reminder-due-at" onChange={(event) => updateField('due_at', event.target.value)} required type="datetime-local" value={values.due_at} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField htmlFor="reminder-note" label="Note">
                  <Textarea id="reminder-note" onChange={(event) => updateField('note', event.target.value)} placeholder="What do you need to follow up about?" value={values.note} />
                </FormField>
              </div>
              {formError ? <p className="text-sm text-danger sm:col-span-2" role="alert">{formError}</p> : null}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button disabled={isSaving} onClick={() => setIsFormOpen(false)} variant="outline">Cancel</Button>
                <Button disabled={isSaving} type="submit">{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create reminder'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card><CardContent className="pt-4"><LoadingState label="Loading reminders" /></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="pt-4"><ErrorState description={error} onRetry={() => setReloadKey((key) => key + 1)} /></CardContent></Card>
      ) : applications.length === 0 && reminders.length === 0 ? (
        <Card><CardContent className="pt-3"><EmptyState description="Add an application before setting a follow-up reminder." icon={<Bell aria-hidden="true" className="size-5" />} title="No applications to follow up on" /></CardContent></Card>
      ) : reminders.length === 0 ? (
        <Card><CardContent className="pt-3"><EmptyState actionLabel="Create a reminder" description="Follow-up dates will be grouped here as upcoming, overdue, or completed." icon={<Bell aria-hidden="true" className="size-5" />} onAction={openCreateForm} title="No reminders yet" /></CardContent></Card>
      ) : (
        <div className="grid gap-5">
          {sections.map(({ title, records, empty, tone }) => (
            <Card key={title}>
              <CardHeader><div className="flex items-center justify-between"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-foreground">{title}</h2><Badge tone={tone}>{records.length}</Badge></div></div></CardHeader>
              {records.length ? <ul className="divide-y divide-border">{records.map(renderReminder)}</ul> : <CardContent><p className="text-sm text-muted-foreground">{empty}</p></CardContent>}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Delete reminder"
        description="This removes the reminder. If its application is deleted, the reminder is removed with it."
        isWorking={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void deleteReminder()}
        open={Boolean(deleteTarget)}
        title="Delete this reminder?"
      />
    </>
  )
}
