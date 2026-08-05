'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  UserX,
  X,
  CalendarClock,
} from 'lucide-react'
import { toast } from 'sonner'

import { NewClassDialog } from '@/components/agenda/new-class-dialog'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SLOT_CAPACITY,
  addDays,
  afternoonSlots,
  availableSlotsForWeekday,
  countActiveInSlot,
  formatWeekRange,
  getMonday,
  getStudent,
  getWeekColumns,
  mergeWeekSessions,
  morningSlots,
  replaceScheduleSlots,
  replaceStudioHours,
  replaceStudentsInStore,
  sessionParticipantName,
  setAttendanceStatus,
  toIsoDate,
  upsertAttendanceSession,
  type AttendanceStatus,
  type ClassSession,
  type WeekDayColumn,
} from '@/lib/data'
import { fetchStudioHours, fetchTimeSlots } from '@/lib/settings-api'
import { fetchStudents } from '@/lib/students-api'
import {
  createStudentSession,
  updateStudentSession,
  upsertFixedStudentSession,
} from '@/lib/sessions-api'
import { cn } from '@/lib/utils'

const statusActions: {
  status: AttendanceStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { status: 'presente', label: 'Confirmar presença', icon: Check },
  { status: 'falta', label: 'Registrar falta', icon: UserX },
  { status: 'reposicao', label: 'Marcar reposição', icon: RefreshCw },
  { status: 'cancelada', label: 'Cancelar aula', icon: X },
  { status: 'agendada', label: 'Voltar para agendada', icon: CalendarClock },
]

const typeLabel: Record<ClassSession['type'], string> = {
  fixa: 'Fixa',
  avulsa: 'Avulsa',
  reposicao: 'Reposição',
  experimental: 'Experimental',
}

function weekKey(monday: Date) {
  return toIsoDate(monday)
}

export function WeeklyAgenda() {
  const today = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(today)
  const [monday, setMonday] = useState(() => getMonday(today))
  const [slotVersion, setSlotVersion] = useState(0)
  const [sessionsByWeek, setSessionsByWeek] = useState<
    Record<string, ClassSession[]>
  >(() => {
    const key = weekKey(getMonday(today))
    return { [key]: [] }
  })
  const [booking, setBooking] = useState<{
    date: string
    time: string
  } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ClassSession | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchTimeSlots(),
      fetchStudioHours(),
      fetchStudents({ active: true }),
    ])
      .then(([slots, hours, list]) => {
        if (cancelled) return
        replaceScheduleSlots(slots)
        replaceStudioHours(hours)
        replaceStudentsInStore(list)
        setSlotVersion((v) => v + 1)
        setSessionsByWeek((prev) => {
          const next = { ...prev }
          for (const week of Object.keys(next)) {
            const mondayDate = new Date(`${week}T12:00:00`)
            next[week] = mergeWeekSessions(mondayDate, [], today)
          }
          return next
        })
      })
      .catch(() => {
        /* mantém grade/horários padrão em memória */
      })
    return () => {
      cancelled = true
    }
  }, [today])

  const key = weekKey(monday)
  const columns = useMemo(() => getWeekColumns(monday), [monday])

  const scheduleSlots = useMemo(() => {
    void slotVersion
    const set = new Set<string>()
    for (const column of columns) {
      for (const slot of availableSlotsForWeekday(column.weekday)) {
        set.add(slot)
      }
    }
    return [...morningSlots, ...afternoonSlots].filter((t) => set.has(t))
  }, [columns, slotVersion])

  const slotCapacity = useMemo(() => {
    void slotVersion
    return SLOT_CAPACITY
  }, [slotVersion])

  // Sempre recalcula a grade fixa a partir dos alunos (reposições manuais são preservadas).
  const sessions = useMemo(() => {
    void slotVersion
    const cached = sessionsByWeek[key] ?? []
    return mergeWeekSessions(monday, cached, today)
  }, [sessionsByWeek, key, monday, today, slotVersion])

  function ensureWeek(nextMonday: Date) {
    const nextKey = weekKey(nextMonday)
    setSessionsByWeek((prev) => {
      const existing = prev[nextKey] ?? []
      return {
        ...prev,
        [nextKey]: mergeWeekSessions(nextMonday, existing, today),
      }
    })
  }

  function goToWeek(nextMonday: Date) {
    ensureWeek(nextMonday)
    setMonday(nextMonday)
  }

  function updateStatus(sessionId: string, status: AttendanceStatus) {
    const base = mergeWeekSessions(monday, sessionsByWeek[key] ?? [], today)
    const current = base.find((s) => s.id === sessionId)
    if (!current) return

    const updated = setAttendanceStatus(current, status)

    setSessionsByWeek((prev) => ({
      ...prev,
      [key]: base.map((s) => (s.id === sessionId ? updated : s)),
    }))

    if (current.studentId) {
      const isGenerated = current.id.startsWith(`${current.studentId}-`)
      if (isGenerated && current.type === 'fixa') {
        // Persistência da aula gerada pela grade: falta/cancelamento geram crédito de reposição.
        void upsertFixedStudentSession(current.studentId, {
          date: current.date,
          time: current.time,
          weekday: current.weekday,
          status,
          notes: updated.notes ?? null,
        }).catch(() => {
          /* agenda local segue; perfil sincroniza ao reabrir */
        })
      } else if (!isGenerated) {
        void updateStudentSession(current.studentId, current.id, {
          status,
        }).catch(() => {
          /* agenda local segue; perfil sincroniza ao reabrir */
        })
      }
    }

    const labels: Record<AttendanceStatus, string> = {
      presente: 'Presença confirmada',
      falta: 'Falta registrada',
      reposicao: 'Marcada como reposição',
      cancelada: 'Aula cancelada',
      agendada: 'Status atualizado',
    }
    toast.success(labels[status], {
      description: 'Presença atualizada',
    })
  }

  async function handleSave(session: ClassSession) {
    const sessionMonday = getMonday(
      new Date(
        Number(session.date.slice(0, 4)),
        Number(session.date.slice(5, 7)) - 1,
        Number(session.date.slice(8, 10)),
      ),
    )
    const targetKey = weekKey(sessionMonday)

    const stripped: Record<string, ClassSession[]> = {}
    for (const [week, list] of Object.entries(sessionsByWeek)) {
      stripped[week] = list.filter((s) => s.id !== session.id)
    }

    const base = mergeWeekSessions(
      sessionMonday,
      stripped[targetKey] ?? [],
      today,
    ).filter((s) => s.id !== session.id)

    const occupied = base.filter(
      (s) =>
        s.date === session.date &&
        s.time === session.time &&
        s.status !== 'cancelada',
    ).length
    if (occupied >= slotCapacity) {
      toast.error('Horário lotado', {
        description: `Este horário já tem ${slotCapacity} pessoas.`,
      })
      throw new Error('Horário lotado')
    }
    if (!availableSlotsForWeekday(session.weekday).includes(session.time)) {
      toast.error('Estúdio fechado', {
        description: 'Não é possível agendar neste dia ou horário.',
      })
      throw new Error('Estúdio fechado')
    }
    const already = base.some(
      (s) =>
        s.studentId === session.studentId &&
        s.date === session.date &&
        s.time === session.time &&
        s.status !== 'cancelada',
    )
    if (already) {
      const message =
        session.type === 'experimental'
          ? 'Cliente já está neste horário'
          : 'Pessoa já está neste horário'
      toast.error(message)
      throw new Error(message)
    }

    const realStudentId =
      session.studentId && !session.studentId.startsWith('guest-')
        ? session.studentId
        : null
    const needsServer =
      Boolean(realStudentId) &&
      (session.type === 'reposicao' ||
        session.type === 'avulsa' ||
        session.type === 'experimental')

    let saved = session
    if (needsServer && realStudentId) {
      const isPersistedId =
        !session.id.startsWith('manual-') &&
        !session.id.startsWith(`${realStudentId}-`)
      try {
        if (isPersistedId && editingSession) {
          saved = await updateStudentSession(realStudentId, session.id, {
            date: session.date,
            time: session.time,
            notes: session.notes ?? null,
            status: session.status,
          })
        } else {
          // Valida crédito de reposição no servidor antes de refletir na agenda.
          saved = await createStudentSession(realStudentId, {
            date: session.date,
            time: session.time,
            type: session.type,
            status: session.status,
            notes: session.notes,
            professionalId: session.professionalId,
          })
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a aula no servidor',
        )
        throw error
      }
    }

    try {
      saved = upsertAttendanceSession(saved)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível agendar neste horário',
      )
      throw err
    }

    setSessionsByWeek((prev) => {
      const nextStripped: Record<string, ClassSession[]> = {}
      for (const [week, list] of Object.entries(prev)) {
        nextStripped[week] = list.filter(
          (s) => s.id !== session.id && s.id !== saved.id,
        )
      }
      const nextBase = mergeWeekSessions(
        sessionMonday,
        nextStripped[targetKey] ?? [],
        today,
      ).filter((s) => s.id !== session.id && s.id !== saved.id)
      return {
        ...nextStripped,
        [targetKey]: [...nextBase, saved].sort((a, b) =>
          `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
        ),
      }
    })

    if (targetKey !== key) {
      setMonday(sessionMonday)
    }
    setBooking(null)
    setEditingSession(null)
    setDialogOpen(false)
  }

  function openEdit(session: ClassSession) {
    setEditingSession(session)
    setBooking(null)
    setDialogOpen(true)
  }

  function openBook(date: string, time: string) {
    setEditingSession(null)
    setBooking({ date, time })
    setDialogOpen(true)
  }

  const isCurrentWeek = key === weekKey(getMonday(today))

  return (
    <>
      <PageHeader
        title="Agenda Pilates"
        description="Grade semanal de aulas de Pilates"
      >
        <NewClassDialog
          defaultDate={booking?.date ?? todayIso}
          defaultTime={booking?.time}
          defaultType={editingSession?.type ?? 'reposicao'}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setBooking(null)
              setEditingSession(null)
            }
          }}
          sessions={sessions}
          editingSession={editingSession}
          onCreate={handleSave}
          hideTrigger={Boolean(editingSession) || Boolean(booking)}
          triggerLabel="Marcar aula"
        />
      </PageHeader>

      <div className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToWeek(addDays(monday, -7))}
              aria-label="Semana anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToWeek(addDays(monday, 7))}
              aria-label="Próxima semana"
            >
              <ChevronRight />
            </Button>
            <span className="text-sm font-semibold tracking-tight">
              {formatWeekRange(monday)}
            </span>
          </div>
          {!isCurrentWeek ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToWeek(getMonday(today))}
            >
              Hoje
            </Button>
          ) : null}
        </div>

        <Card className="hidden overflow-hidden py-0 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-20" />
                {columns.map((column) => (
                  <col key={column.iso} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground">
                    Horário
                  </th>
                  {columns.map((column) => {
                    const isToday = column.iso === todayIso
                    return (
                      <th
                        key={column.iso}
                        className={cn(
                          'px-1.5 py-3 text-center font-medium',
                          isToday && 'bg-primary/5',
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm">{column.weekday}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {column.dayNumber} {column.monthLabel}
                          </span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {scheduleSlots.map((slot) => (
                  <tr key={slot} className="border-b align-top">
                    <td className="px-2 py-2 text-xs font-medium text-muted-foreground">
                      {slot}
                    </td>
                    {columns.map((column) => {
                      const dayOpen = availableSlotsForWeekday(
                        column.weekday,
                      ).includes(slot)
                      const slotSessions = sessions
                        .filter(
                          (s) =>
                            s.date === column.iso &&
                            s.time === slot &&
                            s.status !== 'cancelada',
                        )
                        .sort((a, b) =>
                          a.studentId.localeCompare(b.studentId),
                        )
                      const occupied = countActiveInSlot(
                        sessions,
                        column.iso,
                        slot,
                      )
                      const full = occupied >= slotCapacity
                      return (
                        <td
                          key={`${column.iso}-${slot}`}
                          className={cn(
                            'px-1 py-1',
                            column.iso === todayIso && 'bg-primary/5',
                            !dayOpen && 'bg-muted/30',
                          )}
                        >
                          <div className="flex min-h-14 flex-col gap-1">
                            {slotSessions.map((session) => (
                              <SessionCard
                                key={session.id}
                                session={session}
                                onStatusChange={updateStatus}
                                onEdit={openEdit}
                              />
                            ))}
                            {dayOpen && !full ? (
                              <button
                                type="button"
                                onClick={() => openBook(column.iso, slot)}
                                className={cn(
                                  'flex flex-1 items-center justify-center rounded-md border border-dashed border-transparent p-1 text-muted-foreground transition hover:border-border',
                                  slotSessions.length === 0
                                    ? 'opacity-0 hover:opacity-100 focus-visible:opacity-100'
                                    : 'opacity-70 hover:opacity-100',
                                )}
                                aria-label={`Marcar em ${column.iso} ${slot}`}
                              >
                                <Plus className="size-3.5" />
                                {slotSessions.length > 0 ? (
                                  <span className="ml-1 text-[10px] tabular-nums">
                                    {occupied}/{slotCapacity}
                                  </span>
                                ) : null}
                              </button>
                            ) : null}
                            {dayOpen && full ? (
                              <span className="px-1 text-[10px] text-muted-foreground tabular-nums">
                                {occupied}/{slotCapacity}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-4 lg:hidden">
          {columns.map((column) => (
            <PilatesDayCard
              key={column.iso}
              column={column}
              todayIso={todayIso}
              sessions={sessions}
              capacity={slotCapacity}
              onBook={openBook}
              onEdit={openEdit}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      </div>
    </>
  )
}

const typeTone: Record<ClassSession['type'], string> = {
  fixa: 'bg-primary/12 text-primary',
  avulsa: 'bg-chart-2/15 text-chart-2',
  reposicao: 'bg-chart-5/15 text-chart-5',
  experimental: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
}

function SessionCard({
  session,
  onStatusChange,
  onEdit,
}: {
  session: ClassSession
  onStatusChange: (id: string, status: AttendanceStatus) => void
  onEdit: (session: ClassSession) => void
}) {
  const student = getStudent(session.studentId)
  const displayName =
    session.guestName?.trim() ||
    student?.name ||
    sessionParticipantName(session)
  if (!displayName) return null

  const shortName = displayName.split(' ').slice(0, 2).join(' ')
  const canEdit = session.type !== 'fixa'

  return (
    <div className="rounded-md border bg-card px-1.5 py-1 text-left shadow-sm">
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {student && !session.guestName?.trim() ? (
            <Link
              href={`/alunos/${student.id}`}
              className="min-w-0 truncate text-xs font-medium hover:underline"
              title={displayName}
            >
              {shortName}
            </Link>
          ) : (
            <p className="min-w-0 truncate text-xs font-medium" title={displayName}>
              {shortName}
            </p>
          )}
          <Badge
            variant="outline"
            className={cn(
              'h-4 shrink-0 border-transparent px-1 text-[10px]',
              typeTone[session.type],
            )}
          >
            {typeLabel[session.type]}
          </Badge>
        </div>
        <SessionMenu
          session={session}
          onStatusChange={onStatusChange}
          onEdit={canEdit ? onEdit : undefined}
        />
      </div>
    </div>
  )
}

function PilatesDayCard({
  column,
  todayIso,
  sessions,
  capacity,
  onBook,
  onEdit,
  onStatusChange,
}: {
  column: WeekDayColumn
  todayIso: string
  sessions: ClassSession[]
  capacity: number
  onBook: (date: string, time: string) => void
  onEdit: (session: ClassSession) => void
  onStatusChange: (id: string, status: AttendanceStatus) => void
}) {
  const isToday = column.iso === todayIso
  const daySlots = availableSlotsForWeekday(column.weekday)
  const dayItems = sessions.filter(
    (s) => s.date === column.iso && s.status !== 'cancelada',
  )

  return (
    <Card className={cn(isToday && 'ring-1 ring-primary/25')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {column.weekday}{' '}
            <span className="font-normal text-muted-foreground">
              {column.dayNumber} {column.monthLabel}
            </span>
          </CardTitle>
          <Badge variant="secondary">{dayItems.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {daySlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Estúdio fechado</p>
        ) : (
          daySlots.map((slot) => {
            const slotItems = dayItems
              .filter((s) => s.time === slot)
              .sort((a, b) => a.studentId.localeCompare(b.studentId))
            const occupied = countActiveInSlot(sessions, column.iso, slot)
            const full = occupied >= capacity
            return (
              <div
                key={slot}
                className="flex items-start gap-3 rounded-lg border p-2"
              >
                <div className="flex w-12 shrink-0 flex-col gap-1 pt-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {slot}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {occupied}/{capacity}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {slotItems.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onStatusChange={onStatusChange}
                      onEdit={onEdit}
                    />
                  ))}
                  {!full ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start text-muted-foreground"
                      onClick={() => onBook(column.iso, slot)}
                    >
                      <Plus data-icon="inline-start" />
                      Marcar
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function SessionMenu({
  session,
  onStatusChange,
  onEdit,
}: {
  session: ClassSession
  onStatusChange: (id: string, status: AttendanceStatus) => void
  onEdit?: (session: ClassSession) => void
}) {
  const actions =
    session.type === 'experimental'
      ? statusActions.filter((action) => action.status !== 'reposicao')
      : statusActions.filter((action) =>
          ['presente', 'falta', 'cancelada', 'agendada'].includes(
            action.status,
          ),
        )
  const canEdit = session.type !== 'fixa'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="size-6 shrink-0">
            <MoreHorizontal className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Frequência</DropdownMenuLabel>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.status}
              disabled={session.status === action.status}
              onClick={() => onStatusChange(session.id, action.status)}
            >
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {canEdit && onEdit ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onEdit(session)}>
                <Pencil />
                Editar aula
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
