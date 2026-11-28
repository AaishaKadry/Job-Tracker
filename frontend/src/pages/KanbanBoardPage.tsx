import {
  closestCenter,
  defaultKeyboardCoordinateGetter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type KeyboardCoordinateGetter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  GripVertical,
  MapPin,
  Plus,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ErrorState,
  LoadingState,
} from '../components/feedback/StatePanel'
import { useToast } from '../components/feedback/useToast'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { buttonVariants } from '../components/ui/buttonVariants'
import { Card } from '../components/ui/Card'
import { ApiError, apiClient } from '../lib/api/client'
import {
  applicationStatuses,
  fetchAllApplications,
  statusLabels,
  type ApplicationStatus,
  type ApiResponse,
  type JobApplication,
} from '../lib/api/applications'
import { cn } from '../lib/utils'

const columnStyles: Record<
  ApplicationStatus,
  { dot: string; drop: string }
> = {
  wishlist: {
    dot: 'bg-muted-foreground',
    drop: 'border-muted-foreground/30 bg-muted/50',
  },
  applied: {
    dot: 'bg-info',
    drop: 'border-info/30 bg-info/5',
  },
  assessment: {
    dot: 'bg-warning',
    drop: 'border-warning/30 bg-warning/5',
  },
  interview: {
    dot: 'bg-primary',
    drop: 'border-primary/30 bg-primary/5',
  },
  offer: {
    dot: 'bg-success',
    drop: 'border-success/30 bg-success/5',
  },
  rejected: {
    dot: 'bg-danger',
    drop: 'border-danger/30 bg-danger/5',
  },
  withdrawn: {
    dot: 'bg-muted-foreground/60',
    drop: 'border-muted-foreground/30 bg-muted/40',
  },
}

const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { active, context, currentCoordinates },
) => {
  const direction =
    event.code === 'ArrowRight' || event.code === 'ArrowDown'
      ? 1
      : event.code === 'ArrowLeft' || event.code === 'ArrowUp'
        ? -1
        : 0

  if (!direction) {
    return defaultKeyboardCoordinateGetter(event, {
      active,
      context,
      currentCoordinates,
    })
  }

  const nearestColumnIndex = applicationStatuses.reduce(
    (nearest, status, index) => {
      const rect = context.droppableRects.get(`column:${status}`)
      if (!rect) return nearest
      const distance = Math.hypot(
        rect.left + 8 - currentCoordinates.x,
        rect.top + 8 - currentCoordinates.y,
      )
      return distance < nearest.distance ? { index, distance } : nearest
    },
    { index: -1, distance: Number.POSITIVE_INFINITY },
  ).index
  const nextIndex = nearestColumnIndex + direction
  const targetStatus = applicationStatuses[nextIndex]
  if (!targetStatus) return

  const targetRect = context.droppableRects.get(`column:${targetStatus}`)
  if (!targetRect) return
  return { x: targetRect.left + 8, y: targetRect.top + 8 }
}

function formatDate(value: string | null) {
  if (!value) return 'Date not set'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  return 'The request could not be completed. Please try again.'
}

function ApplicationCard({
  application,
  isSaving,
}: {
  application: JobApplication
  isSaving: boolean
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
  } = useDraggable({
    id: application.id,
    disabled: isSaving,
    data: { status: application.status },
  })

  return (
    <article
      ref={setNodeRef}
      className={cn(
        'rounded-xl border border-border bg-card p-3.5 shadow-card transition-shadow',
        isDragging && 'opacity-35',
        isSaving && 'opacity-70',
      )}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            className="block break-words text-sm font-semibold leading-5 text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            to={`/applications/${application.id}`}
          >
            {application.job_title}
          </Link>
          <p className="mt-1 break-words text-xs font-medium text-muted-foreground">
            {application.company.name}
          </p>
        </div>
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${application.job_title}`}
          className="grid size-8 shrink-0 cursor-grab place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 active:cursor-grabbing"
          type="button"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
        {application.location ? (
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{application.location}</span>
          </p>
        ) : null}
        <p className="flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
          {formatDate(application.application_date)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <Badge
          className="text-[10px]"
          tone={application.status === 'offer' ? 'success' : 'neutral'}
        >
          {statusLabels[application.status]}
        </Badge>
        {isSaving ? (
          <span aria-live="polite" className="text-[11px] text-muted-foreground">
            Saving…
          </span>
        ) : (
          <Link
            aria-label={`Open ${application.job_title} details`}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            to={`/applications/${application.id}`}
          >
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
      </div>
    </article>
  )
}

function BoardColumn({
  status,
  applications,
  savingIds,
}: {
  status: ApplicationStatus
  applications: JobApplication[]
  savingIds: Set<string>
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${status}`,
    data: { status },
  })

  return (
    <section
      aria-label={`${statusLabels[status]} applications`}
      className="flex min-h-[360px] min-w-[260px] flex-col rounded-2xl bg-secondary/60 p-3 sm:min-w-[280px]"
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span
            aria-hidden="true"
            className={cn('size-2 rounded-full', columnStyles[status].dot)}
          />
          {statusLabels[status]}
        </h2>
        <span
          aria-label={`${applications.length} applications`}
          className="rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
        >
          {applications.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 rounded-xl border border-dashed border-transparent p-1 transition-colors',
          isOver && columnStyles[status].drop,
        )}
      >
        {applications.map((application) => (
          <ApplicationCard
            application={application}
            isSaving={savingIds.has(application.id)}
            key={application.id}
          />
        ))}
        {applications.length === 0 ? (
          <div
            className={cn(
              'grid min-h-32 flex-1 place-items-center rounded-lg px-3 text-center text-xs text-muted-foreground',
              isOver && 'font-medium text-foreground',
            )}
          >
            {isOver ? 'Drop here to update status' : 'No applications yet'}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function KanbanBoardPage() {
  const { showToast } = useToast()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: boardKeyboardCoordinates }),
  )

  const loadBoard = useCallback(
    async (signal: AbortSignal) => fetchAllApplications(signal),
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void loadBoard(controller.signal)
      .then((records) => {
        if (!active) return
        setApplications(records)
        setLoadError(null)
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) {
          setLoadError(getErrorMessage(cause))
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [loadBoard, reloadKey])

  const applicationsByStatus = useMemo(
    () =>
      applicationStatuses.reduce<Record<ApplicationStatus, JobApplication[]>>(
        (groups, status) => {
          groups[status] = applications.filter(
            (application) => application.status === status,
          )
          return groups
        },
        {
          wishlist: [],
          applied: [],
          assessment: [],
          interview: [],
          offer: [],
          rejected: [],
          withdrawn: [],
        },
      ),
    [applications],
  )

  const activeApplication = applications.find(
    (application) => application.id === activeApplicationId,
  )

  function getTargetStatus(event: DragEndEvent): ApplicationStatus | null {
    const targetId = event.over?.id
    if (typeof targetId !== 'string') return null
    if (targetId.startsWith('column:')) {
      const status = targetId.slice('column:'.length)
      return applicationStatuses.find((item) => item === status) ?? null
    }
    return applications.find((application) => application.id === targetId)?.status ?? null
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveApplicationId(null)
    if (!event.over || typeof event.active.id !== 'string') return

    const applicationId = event.active.id
    const targetStatus = getTargetStatus(event)
    const application = applications.find((record) => record.id === applicationId)
    if (!application || !targetStatus || application.status === targetStatus) return

    const previousStatus = application.status
    setApplications((records) =>
      records.map((record) =>
        record.id === applicationId ? { ...record, status: targetStatus } : record,
      ),
    )
    setSavingIds((ids) => new Set(ids).add(applicationId))

    try {
      const response = await apiClient.patch<ApiResponse<JobApplication>>(
        `/api/applications/${applicationId}/status`,
        { status: targetStatus },
      )
      setApplications((records) =>
        records.map((record) =>
          record.id === applicationId ? response.data : record,
        ),
      )
      showToast({
        title: 'Application moved',
        description: `${application.job_title} is now ${statusLabels[response.data.status]}.`,
        tone: 'success',
      })
    } catch (error) {
      setApplications((records) =>
        records.map((record) =>
          record.id === applicationId
            ? { ...record, status: previousStatus }
            : record,
        ),
      )
      showToast({
        title: 'Could not move application',
        description: getErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setSavingIds((ids) => {
        const remaining = new Set(ids)
        remaining.delete(applicationId)
        return remaining
      })
    }
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
        description="Move opportunities through each stage and keep your search moving."
        eyebrow="Your job search"
        title="Kanban board"
      />

      {isLoading ? (
        <LoadingState label="Loading your applications" />
      ) : loadError ? (
        <Card>
          <ErrorState
            description={loadError}
            onRetry={() => {
              setIsLoading(true)
              setReloadKey((key) => key + 1)
            }}
          />
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <EmptyBoardState />
        </Card>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragCancel={() => setActiveApplicationId(null)}
          onDragEnd={(event) => void handleDragEnd(event)}
          onDragStart={(event: DragStartEvent) =>
            setActiveApplicationId(String(event.active.id))
          }
          sensors={sensors}
        >
          <div
            aria-label="Applications by status. Use the drag handle to move a card."
            className="grid gap-3 pb-3 sm:grid-flow-col sm:auto-cols-[minmax(280px,1fr)] sm:overflow-x-auto sm:pb-5 xl:auto-cols-[minmax(260px,1fr)] xl:grid-flow-row xl:grid-cols-4 2xl:grid-cols-7"
            role="region"
          >
            {applicationStatuses.map((status) => (
              <BoardColumn
                applications={applicationsByStatus[status]}
                key={status}
                savingIds={savingIds}
                status={status}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeApplication ? (
              <div className="rotate-2 cursor-grabbing rounded-xl border border-primary/30 bg-card p-3.5 shadow-xl ring-2 ring-primary/15">
                <p className="text-sm font-semibold text-foreground">
                  {activeApplication.job_title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeApplication.company.name}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  )
}

function EmptyBoardState() {
  return (
    <div className="p-5">
      <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <BriefcaseBusiness aria-hidden="true" className="size-5" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">Your board is ready</h2>
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
          Add an application to see it in the column for its current status.
        </p>
        <Link className={cn(buttonVariants(), 'mt-5')} to="/applications/new">
          <Plus aria-hidden="true" className="size-4" />
          Add application
        </Link>
      </div>
    </div>
  )
}
