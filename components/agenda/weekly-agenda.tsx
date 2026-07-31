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

import { InlineCell } from '@/components/financeiro/inline-cell'
import { NewClassDialog } from '@/components/agenda/new-class-dialog'
import { AttendanceBadge } from '@/components/status-badges'
import { PageHeader } from '@/components/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
  initials,
  morningSlots,
  renameScheduleSlot,
  replaceScheduleSlots,
  replaceStudioHours,
  sessionParticipantName,
  setAttendanceStatus,
  toIsoDate,
  upsertAttendanceSession,
  upsertStudentInStore,
  type AttendanceStatus,
  type ClassSession,
  type WeekDayColumn,
} from '@/lib/data'
import { fetchStudents } from '@/lib/students-api'
import { fetchStudioHours, fetchTimeSlots } from '@/lib/settings-api'
import {
  createStudentSession,
  fetchWeekAgenda,
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

function isGeneratedFixedId(session: ClassSession) {
  return (
    session.type === 'fixa' &&
    Boolean(session.studentId) &&
    session.id.startsWith(`${session.studentId}-`)
  )
}

export function WeeklyAgenda() {
  const today = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(today)
  const [monday, setMonday] = useState(() => getMonday(today))
  const [slotVersion, setSlotVersion] = useState(0)
  const [sessionsByWeek, setSessionsByWeek] = useState<
    Record<string, ClassSession[]>
  >({})
  const [loadingWeek, setLoadingWeek] = useState(true)
  const [reloadTick, setReloadTick] = useState(0)
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
    void Promise.all([fetchTimeSlots(), fetchStudioHours(), fetchStudents({ active: true })])
      .then(([slots, hours, students]) => {
        if (cancelled) return
        replaceScheduleSlots(slots)
        replaceStudioHours(hours)
        for (const student of students) {
          upsertStudentInStore(student)
        }
        setSlotVersion((v) => v + 1)
      })
      .catch(() => {
        /* mantém grade/horários padrão em memória */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const from = toIsoDate(monday)
    const to = toIsoDate(addDays(monday, 5))
    const nextKey = weekKey(monday)
    setLoadingWeek(true)
    void fetchWeekAgenda(from, to)
      .then((agenda) => {
        if (cancelled) return
        for (const student of agenda.students) {
          const existing = getStudent(student.id)
          if (existing) {
            upsertStudentInStore({
              ...existing,
              name: student.name,
              planId: student.planId,
              schedule: student.schedule,
              active: student.active,
            })
          }
        }
        setSessionsByWeek((prev) => ({
          ...prev,
          [nextKey]: agenda.sessions,
        }))
      })
      .catch(() => {
        if (cancelled) return
        toast.error('Não foi possível carregar a agenda da semana')
        setSessionsByWeek((prev) => ({
          ...prev,
          [nextKey]: prev[nextKey] ?? [],
        }))
      })
      .finally(() => {
        if (!cancelled) setLoadingWeek(false)
      })
    return () => {
      cancelled = true
    }
  }, [monday, reloadTick])

  const key = weekKey(monday)
  const columns = useMemo(() => getWeekColumns(monday), [monday])

  const scheduleBlocks = useMemo(() => {
    void slotVersion
    return [
      { id: 'manha' as const, label: 'Manhã', slots: [...morningSlots] },
      { id: 'tarde' as const, label: 'Tarde', slots: [...afternoonSlots] },
    ]
  }, [slotVersion])

  const slotCapacity = useMemo(() => {
    void slotVersion
    return SLOT_CAPACITY
  }, [slotVersion])

  const slotRangeHint = useMemo(() => {
    void slotVersion
    const morning =
      morningSlots.length > 0
        ? `${morningSlots[0].slice(0, 2)}–${morningSlots[morningSlots.length - 1].slice(0, 2)}h`
        : '—'
    const afternoon =
      afternoonSlots.length > 0
        ? `${afternoonSlots[0].slice(0, 2)}–${afternoonSlots[afternoonSlots.length - 1].slice(0, 2)}h`
        : '—'
    return `Manhã ${morning} · Tarde ${afternoon} · até ${SLOT_CAPACITY} vagas/horário`
  }, [slotVersion])

  const sessions = useMemo(() => {
    const raw = sessionsByWeek[key] ?? []
    // Avulsa/reposição/experimental cancelada sai da grade (não conta como falta).
    return raw.filter(
      (s) => !(s.status === 'cancelada' && s.type !== 'fixa'),
    )
  }, [sessionsByWeek, key])

  function goToWeek(nextMonday: Date) {
    setMonday(nextMonday)
  }

  function handleRenameSlot(oldTime: string, nextRaw: string) {
    const result = renameScheduleSlot(oldTime, nextRaw)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    if (result.time === oldTime) return

    setSessionsByWeek((prev) => {
      const next: Record<string, ClassSession[]> = {}
      for (const [week, list] of Object.entries(prev)) {
        next[week] = list.map((session) =>
          session.time === oldTime
            ? { ...session, time: result.time }
            : session,
        )
      }
      return next
    })
    setSlotVersion((v) => v + 1)
    toast.success('Horário atualizado', {
      description: `${oldTime} → ${result.time}`,
    })
  }

  function updateStatus(sessionId: string, status: AttendanceStatus) {
    const base = sessionsByWeek[key] ?? []
    const current = base.find((s) => s.id === sessionId)
    if (!current) return

    const updated = setAttendanceStatus(current, status)

    setSessionsByWeek((prev) => ({
      ...prev,
      [key]: base.map((s) => (s.id === sessionId ? updated : s)),
    }))

    const labels: Record<AttendanceStatus, string> = {
      presente: 'Presença confirmada',
      falta: 'Falta registrada',
      reposicao: 'Marcada como reposição',
      cancelada: 'Aula cancelada',
      agendada: 'Status atualizado',
    }

    if (!current.studentId) {
      toast.success(labels[status], { description: 'Presença atualizada' })
      return
    }

    const persist = isGeneratedFixedId(current)
      ? upsertFixedStudentSession(current.studentId, {
          date: current.date,
          time: current.time,
          weekday: current.weekday,
          status,
          notes: current.notes,
        }).then((saved) => {
          setSessionsByWeek((prev) => ({
            ...prev,
            [key]: (prev[key] ?? []).map((s) =>
              s.id === sessionId ||
              (s.studentId === saved.studentId &&
                s.date === saved.date &&
                s.time === saved.time &&
                s.type === 'fixa')
                ? { ...saved }
                : s,
            ),
          }))
          try {
            upsertAttendanceSession(saved)
          } catch {
            /* ledger local */
          }
          return saved
        })
      : updateStudentSession(current.studentId, current.id, { status })

    void persist
      .then(() => {
        toast.success(labels[status], { description: 'Presença atualizada' })
      })
      .catch((error) => {
        setSessionsByWeek((prev) => ({
          ...prev,
          [key]: (prev[key] ?? []).map((s) =>
            s.id === sessionId ? current : s,
          ),
        }))
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a presença',
        )
      })
  }

  function handleSave(session: ClassSession) {
    const sessionMonday = getMonday(
      new Date(
        Number(session.date.slice(0, 4)),
        Number(session.date.slice(5, 7)) - 1,
        Number(session.date.slice(8, 10)),
      ),
    )
    const targetKey = weekKey(sessionMonday)
    const base = (sessionsByWeek[targetKey] ?? []).filter(
      (s) => s.id !== session.id,
    )

    const occupied = base.filter(
      (s) =>
        s.date === session.date &&
        s.time === session.time &&
        s.status !== 'cancelada',
    ).length
    if (occupied >= slotCapacity) {
      toast.error('Horário lotado', {
        description: `Este horário já tem ${slotCapacity} alunos.`,
      })
      return
    }
    if (!availableSlotsForWeekday(session.weekday).includes(session.time)) {
      toast.error('Estúdio fechado', {
        description: 'Não é possível agendar neste dia ou horário.',
      })
      return
    }
    const already = base.some(
      (s) =>
        s.studentId === session.studentId &&
        s.date === session.date &&
        s.time === session.time &&
        s.status !== 'cancelada',
    )
    if (already) {
      toast.error(
        session.type === 'experimental'
          ? 'Cliente já está neste horário'
          : 'Aluno já está neste horário',
      )
      return
    }

    try {
      const saved = upsertAttendanceSession(session)
      setSessionsByWeek((prev) => ({
        ...prev,
        [targetKey]: [...base, saved].sort((a, b) =>
          `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
        ),
      }))

      if (
        session.studentId &&
        (session.type === 'reposicao' ||
          session.type === 'avulsa' ||
          session.type === 'experimental')
      ) {
        void createStudentSession(session.studentId, {
          date: session.date,
          time: session.time,
          type: session.type,
          status: session.status,
          notes: session.notes,
          professionalId: session.professionalId,
        })
          .then((created) => {
            setSessionsByWeek((prev) => ({
              ...prev,
              [targetKey]: (prev[targetKey] ?? []).map((s) =>
                s.id === saved.id ? created : s,
              ),
            }))
            try {
              upsertAttendanceSession(created)
            } catch {
              /* ledger */
            }
          })
          .catch((error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : 'Não foi possível salvar a aula no servidor',
            )
            setReloadTick((t) => t + 1)
          })
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível agendar neste horário',
      )
      return
    }

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

  const weekStats = useMemo(() => {
    const total = sessions.filter((s) => s.status !== 'cancelada').length
    const presentes = sessions.filter((s) => s.status === 'presente').length
    const faltas = sessions.filter((s) => s.status === 'falta').length
    const pendentes = sessions.filter((s) => s.status === 'agendada').length
    // Só aulas fixas canceladas entram no card (avulsa cancelada já foi filtrada).
    const canceladas = sessions.filter(
      (s) => s.status === 'cancelada' && s.type === 'fixa',
    ).length
    return { total, presentes, faltas, pendentes, canceladas }
  }, [sessions])

  const isCurrentWeek = key === weekKey(getMonday(today))

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Grade dos alunos com contrato ativo · mesma agenda fixa do perfil · reposição/avulsa pelo +"
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
          hideTrigger={Boolean(editingSession)}
          triggerLabel="Marcar aula"
        />
      </PageHeader>

      <div className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                {formatWeekRange(monday)}
              </span>
              <span className="text-xs text-muted-foreground">
                {loadingWeek ? 'Carregando agenda…' : slotRangeHint}
              </span>
            </div>
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

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatPill label="Alunos na grade" value={weekStats.total} />
          <StatPill label="Presenças" value={weekStats.presentes} />
          <StatPill label="Pendentes" value={weekStats.pendentes} />
          <StatPill
            label="Faltas / canceladas"
            value={weekStats.faltas + weekStats.canceladas}
            accent
          />
        </div>

        {/* Desktop timetable */}
        <Card className="hidden overflow-hidden py-0 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-24" />
                {columns.map((column) => (
                  <col key={column.iso} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/40 px-2 py-3 text-left text-xs font-medium text-muted-foreground">
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
                          {isToday ? (
                            <Badge className="mt-0.5 h-4 px-1.5 text-[10px]">
                              Hoje
                            </Badge>
                          ) : null}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {scheduleBlocks.map((block) => (
                  <PeriodRows
                    key={block.id}
                    label={block.label}
                    slots={block.slots}
                    capacity={slotCapacity}
                    columns={columns}
                    sessions={sessions}
                    todayIso={todayIso}
                    onStatusChange={updateStatus}
                    onRenameSlot={handleRenameSlot}
                    onBook={openBook}
                    onEdit={openEdit}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile / tablet */}
        <div className="flex flex-col gap-4 lg:hidden">
          {columns.map((column) => {
            const isToday = column.iso === todayIso
            const daySlots = availableSlotsForWeekday(column.weekday)
            const dayCount = sessions.filter(
              (s) => s.date === column.iso && s.status !== 'cancelada',
            ).length

            return (
              <Card
                key={column.iso}
                className={cn(isToday && 'ring-1 ring-primary/25')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {column.weekday}
                        {isToday ? (
                          <Badge className="ml-2 align-middle">Hoje</Badge>
                        ) : null}
                      </CardTitle>
                      <CardDescription>
                        {column.dayNumber} {column.monthLabel} · {dayCount}{' '}
                        aluno(s)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {daySlots.length === 0 ? (
                    <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                      Estúdio fechado neste dia
                    </p>
                  ) : null}
                  {scheduleBlocks.map((block) => {
                    const slots = block.slots.filter((t) =>
                      daySlots.includes(t),
                    )
                    if (slots.length === 0) return null
                    return (
                      <div key={block.id} className="flex flex-col gap-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {block.label}
                        </p>
                        {slots.map((time) => (
                          <MobileSlot
                            key={time}
                            column={column}
                            time={time}
                            capacity={slotCapacity}
                            sessions={sessions}
                            onStatusChange={updateStatus}
                            onRenameSlot={handleRenameSlot}
                            onBook={() => openBook(column.iso, time)}
                            onEdit={openEdit}
                          />
                        ))}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Como usar</CardTitle>
            <CardDescription>
              A grade fixa vem da agenda do aluno (horários do contrato ativo).
              Clique no nome para abrir o perfil. Use os três pontinhos para
              marcar presença, falta ou cancelar. Cada horário tem até{' '}
              {slotCapacity} vagas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {statusActions.map((action) => (
              <AttendanceBadge key={action.status} status={action.status} />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function PeriodRows({
  label,
  slots,
  capacity,
  columns,
  sessions,
  todayIso,
  onStatusChange,
  onRenameSlot,
  onBook,
  onEdit,
}: {
  label: string
  slots: readonly string[]
  capacity: number
  columns: WeekDayColumn[]
  sessions: ClassSession[]
  todayIso: string
  onStatusChange: (id: string, status: AttendanceStatus) => void
  onRenameSlot: (oldTime: string, nextRaw: string) => void
  onBook: (date: string, time: string) => void
  onEdit: (session: ClassSession) => void
}) {
  return (
    <>
      <tr className="border-b bg-muted/25">
        <td
          colSpan={columns.length + 1}
          className="px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          {label}
        </td>
      </tr>
      {slots.map((time) => (
        <tr key={time} className="border-b last:border-b-0">
          <td className="sticky left-0 z-10 bg-background px-2 py-2 align-top">
            <InlineCell
              value={time}
              className="font-mono text-sm font-medium tabular-nums"
              onSave={(next) => onRenameSlot(time, next)}
            />
          </td>
          {columns.map((column) => {
            const available = availableSlotsForWeekday(column.weekday)
            const closed = !available.includes(time)
            const isToday = column.iso === todayIso
            const slotSessions = sessions
              .filter(
                (s) =>
                  s.date === column.iso &&
                  s.time === time &&
                  s.status !== 'cancelada',
              )
              .sort((a, b) => a.studentId.localeCompare(b.studentId))
            const occupied = countActiveInSlot(sessions, column.iso, time)
            const full = occupied >= capacity

            return (
              <td
                key={column.iso}
                className={cn(
                  'px-1 py-1.5 align-top',
                  isToday && 'bg-primary/[0.03]',
                  closed && 'bg-muted/30',
                )}
              >
                {closed ? (
                  <div className="flex h-full min-h-16 items-center justify-center rounded-lg text-[11px] text-muted-foreground">
                    Fechado
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex min-h-16 flex-col gap-1 rounded-lg border p-1.5',
                      full
                        ? 'border-primary/25 bg-primary/[0.04]'
                        : 'border-border/80 bg-card',
                    )}
                  >
                    <div className="flex items-center justify-between px-0.5">
                      <span
                        className={cn(
                          'text-[10px] font-medium tabular-nums',
                          full
                            ? 'text-primary'
                            : 'text-muted-foreground',
                        )}
                      >
                        {occupied}/{capacity}
                      </span>
                      {!full ? (
                        <button
                          type="button"
                          onClick={() => onBook(column.iso, time)}
                          className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`Marcar aula às ${time}`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      {slotSessions.map((session) => (
                        <StudentChip
                          key={session.id}
                          session={session}
                          onStatusChange={onStatusChange}
                          onEdit={onEdit}
                        />
                      ))}
                      {Array.from({
                        length: Math.max(0, capacity - occupied),
                      }).map((_, i) => (
                        <button
                          key={`empty-${i}`}
                          type="button"
                          onClick={() => onBook(column.iso, time)}
                          className="flex h-7 items-center justify-center rounded-md border border-dashed border-border/70 text-[10px] text-muted-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          vaga
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

function MobileSlot({
  column,
  time,
  capacity,
  sessions,
  onStatusChange,
  onRenameSlot,
  onBook,
  onEdit,
}: {
  column: WeekDayColumn
  time: string
  capacity: number
  sessions: ClassSession[]
  onStatusChange: (id: string, status: AttendanceStatus) => void
  onRenameSlot: (oldTime: string, nextRaw: string) => void
  onBook: () => void
  onEdit: (session: ClassSession) => void
}) {
  const slotSessions = sessions
    .filter(
      (s) =>
        s.date === column.iso &&
        s.time === time &&
        s.status !== 'cancelada',
    )
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
  const occupied = countActiveInSlot(sessions, column.iso, time)
  const full = occupied >= capacity

  return (
    <div className="rounded-xl border border-border p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <InlineCell
            value={time}
            className="w-auto font-mono text-sm font-semibold tabular-nums"
            onSave={(next) => onRenameSlot(time, next)}
          />
          <Badge
            variant="outline"
            className={cn(
              'h-5 shrink-0 px-1.5 text-[10px] tabular-nums',
              full && 'border-primary/30 bg-primary/10 text-primary',
            )}
          >
            {occupied}/{capacity}
          </Badge>
        </div>
        {!full ? (
          <Button variant="outline" size="xs" onClick={onBook}>
            <Plus data-icon="inline-start" />
            Marcar
          </Button>
        ) : (
          <span className="text-[11px] font-medium text-primary">Lotado</span>
        )}
      </div>
      {slotSessions.length === 0 ? (
        <button
          type="button"
          onClick={onBook}
          className="flex w-full items-center justify-center rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Nenhuma vaga ocupada — tocar para marcar
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {slotSessions.map((session) => (
            <StudentChip
              key={session.id}
              session={session}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              expanded
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StudentChip({
  session,
  onStatusChange,
  onEdit,
  expanded,
}: {
  session: ClassSession
  onStatusChange: (id: string, status: AttendanceStatus) => void
  onEdit: (session: ClassSession) => void
  expanded?: boolean
}) {
  const student = getStudent(session.studentId)
  const displayName =
    session.guestName?.trim() || student?.name || sessionParticipantName(session)
  if (!displayName) return null

  const shortName = displayName.split(' ').slice(0, 2).join(' ')
  const isGuest = !student || Boolean(session.guestName?.trim() && !student)

  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-1.5 py-1',
        session.status === 'cancelada' && 'opacity-50',
        session.status === 'falta' && 'border-destructive/20 bg-destructive/5',
        session.status === 'presente' && 'border-primary/20 bg-primary/5',
        session.type === 'experimental' &&
          'border-amber-500/30 bg-amber-500/5',
        expanded && 'px-2 py-1.5',
      )}
    >
      <Avatar className={cn('size-5', expanded && 'size-6')}>
        <AvatarFallback className="text-[9px]">
          {initials(displayName)}
        </AvatarFallback>
      </Avatar>
      {isGuest ? (
        <span
          className="min-w-0 flex-1 truncate text-xs font-medium"
          title={displayName}
        >
          {shortName}
        </span>
      ) : (
        <Link
          href={`/alunos/${student!.id}`}
          className="min-w-0 flex-1 truncate text-xs font-medium hover:underline"
          title={displayName}
        >
          {shortName}
        </Link>
      )}
      {session.type !== 'fixa' ? (
        <span className="hidden text-[9px] text-muted-foreground sm:inline">
          {typeLabel[session.type]}
        </span>
      ) : null}
      {expanded ? <AttendanceBadge status={session.status} /> : null}
      <SessionMenu
        session={session}
        onStatusChange={onStatusChange}
        onEdit={onEdit}
      />
    </div>
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
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Ações de frequência"
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Frequência / presença</DropdownMenuLabel>
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

function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 text-2xl font-semibold tracking-tight',
            accent && 'text-destructive',
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
