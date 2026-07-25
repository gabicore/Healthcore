'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
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
  isSlotFull,
  mergeWeekSessions,
  morningSlots,
  renameScheduleSlot,
  setAttendanceStatus,
  toIsoDate,
  upsertAttendanceSession,
  type AttendanceStatus,
  type ClassSession,
  type WeekDayColumn,
} from '@/lib/data'
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
    return { [key]: mergeWeekSessions(getMonday(today), [], today) }
  })
  const [booking, setBooking] = useState<{
    date: string
    time: string
  } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const key = weekKey(monday)
  const columns = useMemo(() => getWeekColumns(monday), [monday])

  const scheduleBlocks = useMemo(() => {
    void slotVersion
    return [
      { id: 'manha' as const, label: 'Manhã', slots: [...morningSlots] },
      { id: 'tarde' as const, label: 'Tarde', slots: [...afternoonSlots] },
    ]
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
    return `Manhã ${morning} · Tarde ${afternoon} · clique no horário para editar`
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
    const base = mergeWeekSessions(monday, sessionsByWeek[key] ?? [], today)
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
    toast.success(labels[status], {
      description:
        'A alteração será salva quando o banco de dados for conectado.',
    })
  }

  function handleCreate(session: ClassSession) {
    const sessionMonday = getMonday(
      new Date(
        Number(session.date.slice(0, 4)),
        Number(session.date.slice(5, 7)) - 1,
        Number(session.date.slice(8, 10)),
      ),
    )
    const targetKey = weekKey(sessionMonday)

    setSessionsByWeek((prev) => {
      const base = mergeWeekSessions(
        sessionMonday,
        prev[targetKey] ?? [],
        today,
      )
      if (isSlotFull(base, session.date, session.time)) {
        toast.error('Horário lotado', {
          description: `Este horário já tem ${SLOT_CAPACITY} alunos.`,
        })
        return prev
      }
      const already = base.some(
        (s) =>
          s.studentId === session.studentId &&
          s.date === session.date &&
          s.time === session.time &&
          s.status !== 'cancelada',
      )
      if (already) {
        toast.error('Aluno já está neste horário')
        return prev
      }
      const saved = upsertAttendanceSession(session)
      return {
        ...prev,
        [targetKey]: [...base, saved].sort((a, b) =>
          `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
        ),
      }
    })

    if (targetKey !== key) {
      setMonday(sessionMonday)
    }
    setBooking(null)
    setDialogOpen(false)
  }

  const weekStats = useMemo(() => {
    const total = sessions.filter((s) => s.status !== 'cancelada').length
    const presentes = sessions.filter((s) => s.status === 'presente').length
    const faltas = sessions.filter((s) => s.status === 'falta').length
    const pendentes = sessions.filter((s) => s.status === 'agendada').length
    const canceladas = sessions.filter((s) => s.status === 'cancelada').length
    return { total, presentes, faltas, pendentes, canceladas }
  }, [sessions])

  const isCurrentWeek = key === weekKey(getMonday(today))

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Grade dos alunos · reposição, avulsa ou experimental pelo + ou Marcar aula"
      >
        <NewClassDialog
          defaultDate={booking?.date ?? todayIso}
          defaultTime={booking?.time}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setBooking(null)
          }}
          sessions={sessions}
          onCreate={handleCreate}
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
                {slotRangeHint}
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
                    columns={columns}
                    sessions={sessions}
                    todayIso={todayIso}
                    onStatusChange={updateStatus}
                    onRenameSlot={handleRenameSlot}
                    onBook={(date, time) => {
                      setBooking({ date, time })
                      setDialogOpen(true)
                    }}
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
                            sessions={sessions}
                            onStatusChange={updateStatus}
                            onRenameSlot={handleRenameSlot}
                            onBook={() => {
                              setBooking({ date: column.iso, time })
                              setDialogOpen(true)
                            }}
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
              Clique no horário à esquerda para editar a grade. A agenda fixa
              vem do cadastro de cada aluno (limitada ao plano). Cada horário
              tem até {SLOT_CAPACITY} vagas. Use + ou Marcar aula para
              reposição, avulsa ou experimental. Menu do aluno: presença,
              falta ou cancelamento.
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
  columns,
  sessions,
  todayIso,
  onStatusChange,
  onRenameSlot,
  onBook,
}: {
  label: string
  slots: readonly string[]
  columns: WeekDayColumn[]
  sessions: ClassSession[]
  todayIso: string
  onStatusChange: (id: string, status: AttendanceStatus) => void
  onRenameSlot: (oldTime: string, nextRaw: string) => void
  onBook: (date: string, time: string) => void
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
            const full = occupied >= SLOT_CAPACITY

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
                    —
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
                        {occupied}/{SLOT_CAPACITY}
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
                        />
                      ))}
                      {Array.from({
                        length: Math.max(0, SLOT_CAPACITY - occupied),
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
  sessions,
  onStatusChange,
  onRenameSlot,
  onBook,
}: {
  column: WeekDayColumn
  time: string
  sessions: ClassSession[]
  onStatusChange: (id: string, status: AttendanceStatus) => void
  onRenameSlot: (oldTime: string, nextRaw: string) => void
  onBook: () => void
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
  const full = occupied >= SLOT_CAPACITY

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
            {occupied}/{SLOT_CAPACITY}
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
  expanded,
}: {
  session: ClassSession
  onStatusChange: (id: string, status: AttendanceStatus) => void
  expanded?: boolean
}) {
  const student = getStudent(session.studentId)
  const name = session.guestName?.trim() || student?.name
  if (!name) return null

  const shortName = name.split(' ').slice(0, 2).join(' ')
  const isGuest = Boolean(session.guestName?.trim()) && !student

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
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {isGuest ? (
        <span
          className="min-w-0 flex-1 truncate text-xs font-medium"
          title={name}
        >
          {shortName}
        </span>
      ) : (
        <Link
          href={`/alunos/${student!.id}`}
          className="min-w-0 flex-1 truncate text-xs font-medium hover:underline"
          title={name}
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
      <SessionMenu session={session} onStatusChange={onStatusChange} />
    </div>
  )
}

function SessionMenu({
  session,
  onStatusChange,
}: {
  session: ClassSession
  onStatusChange: (id: string, status: AttendanceStatus) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-5 shrink-0 text-muted-foreground"
            aria-label="Ações da aula"
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Atualizar status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statusActions.map((action) => (
          <DropdownMenuItem
            key={action.status}
            disabled={session.status === action.status}
            onClick={() => onStatusChange(session.id, action.status)}
          >
            <action.icon />
            {action.label}
          </DropdownMenuItem>
        ))}
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
