'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, RefreshCw, UserX, X, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'

import { AttendanceBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  afternoonSlots,
  availableSlotsForWeekday,
  currentScheduleSlots,
  formatShortDate,
  getAttendanceStats,
  getMakeupAllowance,
  getStudentAttendanceHistory,
  getTimeSlots,
  getWeekdayFromDate,
  morningSlots,
  parseIsoDate,
  contractTotalClasses,
  professionals,
  replaceStudioHours,
  scheduleSlotsOnDate,
  setAttendanceStatus,
  toIsoDate,
  upsertAttendanceSession,
  type AttendanceStatus,
  type ClassSession,
  type Plan,
  type ScheduleSlot,
} from '@/lib/data'
import { fetchStudentContracts } from '@/lib/contracts-api'
import { fetchPlans, fetchStudioHours } from '@/lib/settings-api'
import {
  createStudentSession,
  fetchStudentSessions,
  updateStudentSession,
  upsertFixedStudentSession,
} from '@/lib/sessions-api'

const statusActions: {
  status: AttendanceStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { status: 'presente', label: 'Presente', icon: Check },
  { status: 'falta', label: 'Falta', icon: UserX },
  { status: 'cancelada', label: 'Cancelar', icon: X },
  { status: 'agendada', label: 'Agendada', icon: CalendarPlus },
]

type StudentAttendancePanelProps = {
  studentId: string
  /** Agenda fixa atual do aluno (API). */
  schedule: ScheduleSlot[]
  /** Plano efetivo (contrato vigente ou cadastro). */
  planId: string
  /** Plano do cadastro — só usado se não houver contrato vigente. */
  fallbackPlanId: string
  /** Início do histórico (contrato ou aluno desde). */
  historyFrom: string
  /** Fim do histórico (fim do contrato, se houver). */
  historyTo?: string | null
  plans?: Plan[]
}

export function StudentAttendancePanel({
  studentId,
  schedule,
  planId,
  fallbackPlanId,
  historyFrom,
  historyTo = null,
  plans: plansProp = [],
}: StudentAttendancePanelProps) {
  const [version, setVersion] = useState(0)
  const [displayTick, setDisplayTick] = useState(0)
  const [contractPlan, setContractPlan] = useState<Plan | null>(null)
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null)
  const [makeupOpen, setMakeupOpen] = useState(false)
  const [makeupSource, setMakeupSource] = useState<ClassSession | null>(null)
  const [rangeFrom, setRangeFrom] = useState(historyFrom)
  const [rangeTo, setRangeTo] = useState<string | null>(historyTo)
  const [persistedSessions, setPersistedSessions] = useState<ClassSession[]>(
    [],
  )

  useEffect(() => {
    setRangeFrom(historyFrom)
    setRangeTo(historyTo)
  }, [historyFrom, historyTo])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchStudentContracts(studentId),
      plansProp.length > 0 ? Promise.resolve(plansProp) : fetchPlans(),
    ])
      .then(async ([contracts, planRows]) => {
        if (cancelled) return
        const active = contracts.find((c) => c.status === 'ativo')
        const resolvedPlanId = active?.planId ?? fallbackPlanId
        const plan = planRows.find((p) => p.id === resolvedPlanId) ?? null
        setContractPlan(plan)
        const from = active?.startDate ?? historyFrom
        const to = active?.endDate ?? historyTo ?? undefined
        if (active) {
          setRangeFrom(active.startDate)
          setRangeTo(active.endDate)
        } else {
          setRangeFrom(historyFrom)
          setRangeTo(historyTo)
        }
        const extras = await fetchStudentSessions(studentId, {
          from,
          to: to ?? undefined,
        }).catch(() => [] as ClassSession[])
        if (cancelled) return
        setPersistedSessions(extras)
        for (const session of extras) {
          try {
            upsertAttendanceSession(session)
          } catch {
            /* horário fora do funcionamento atual — ainda aparece no histórico */
          }
        }
      })
      .catch(() => {
        if (cancelled) return
        const plan = plansProp.find((p) => p.id === fallbackPlanId) ?? null
        setContractPlan(plan)
      })
    return () => {
      cancelled = true
    }
    // plansProp.length: evita loop se o pai recriar o array a cada render
  }, [studentId, fallbackPlanId, version, plansProp.length, historyFrom])

  // Quando os planos do pai chegam depois, re-resolve o plano ativo.
  useEffect(() => {
    if (!contractPlan && plansProp.length > 0 && fallbackPlanId) {
      const plan = plansProp.find((p) => p.id === fallbackPlanId)
      if (plan) setContractPlan(plan)
    }
  }, [plansProp, fallbackPlanId, contractPlan])

  const historyBounds = useMemo(() => {
    const todayIso = toIsoDate(new Date())
    const from = rangeFrom || historyFrom
    const contractEnd = rangeTo || historyTo || null
    // Histórico exibe até o fim real do contrato (inclui aulas futuras da vigência).
    const to = contractEnd ?? todayIso
    return { from, to, contractEnd, todayIso }
  }, [rangeFrom, rangeTo, historyFrom, historyTo])

  const weeklyLimit = contractPlan?.frequency ?? null
  const activeSchedule = useMemo(
    () => currentScheduleSlots(schedule),
    [schedule],
  )
  /** Frequência só libera com a grade atual completa (dias do plano). */
  const scheduleComplete =
    weeklyLimit != null
      ? activeSchedule.length >= weeklyLimit
      : activeSchedule.length > 0

  const sessions = useMemo(() => {
    void displayTick
    if (!scheduleComplete) return []
    return getStudentAttendanceHistory(studentId, {
      schedule,
      planId,
      weeklyLimit: weeklyLimit ?? undefined,
      fromDate: historyBounds.from,
      toDate: historyBounds.to,
      extraSessions: persistedSessions,
    })
  }, [
    studentId,
    schedule,
    scheduleComplete,
    planId,
    weeklyLimit,
    historyBounds,
    displayTick,
    persistedSessions,
  ])

  const stats = useMemo(() => getAttendanceStats(sessions), [sessions])

  const fixedSessions = useMemo(
    () => sessions.filter((s) => s.type === 'fixa'),
    [sessions],
  )

  /** Mesmo total da vigência no financeiro: início → fim × frequência. */
  const totalContractClasses = useMemo(() => {
    if (!contractPlan || !historyBounds.from || !historyBounds.contractEnd) {
      return fixedSessions.length
    }
    return contractTotalClasses({
      startDate: historyBounds.from,
      endDate: historyBounds.contractEnd,
      frequency: contractPlan.frequency,
    })
  }, [
    contractPlan,
    historyBounds.from,
    historyBounds.contractEnd,
    fixedSessions.length,
  ])

  const makeupAllowance = useMemo(
    () =>
      getMakeupAllowance(sessions, {
        fromDate: historyBounds.from,
        toDate: historyBounds.contractEnd ?? historyBounds.to,
      }),
    [sessions, historyBounds],
  )

  /** Aulas fixas com falta/cancelamento ainda sem reposição + reposições falhas. */
  const toRemakeSessions = useMemo(() => {
    const byId = new Map<string, ClassSession>()
    for (const session of [
      ...makeupAllowance.pendingMissed,
      ...makeupAllowance.failedMakeups,
    ]) {
      byId.set(session.id, session)
    }
    return [...byId.values()].sort((a, b) =>
      `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
    )
  }, [makeupAllowance.pendingMissed, makeupAllowance.failedMakeups])

  /** Reposições já marcadas/reagendadas (permanecem na grade com status atual). */
  const remadeSessions = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            s.type === 'reposicao' &&
            (s.status === 'agendada' || s.status === 'presente'),
        )
        .sort((a, b) =>
          `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
        ),
    [sessions],
  )

  function openMakeupDialog(session?: ClassSession) {
    if (session?.type === 'reposicao') {
      setEditingSession(session)
      return
    }
    if (makeupAllowance.remaining <= 0) {
      toast.error('Nada a remarcar', {
        description:
          makeupAllowance.missed === 0
            ? 'Marque falta ou cancelamento em uma aula fixa para liberar reposição.'
            : 'Todas as faltas/cancelamentos deste contrato já foram remarcados. Reposições com falta podem ser editadas na lista.',
      })
      return
    }
    setMakeupSource(session ?? makeupAllowance.pendingMissed[0] ?? null)
    setMakeupOpen(true)
  }

  function refresh() {
    setVersion((v) => v + 1)
  }

  function isDbSession(session: ClassSession) {
    // Aulas geradas da agenda fixa usam id `${studentId}-${date}-${time}`.
    return !session.id.startsWith(`${session.studentId}-`)
  }

  function handleStatus(session: ClassSession, status: AttendanceStatus) {
    const previous = session.status
    try {
      setAttendanceStatus({ ...session, status }, status)
    } catch {
      /* ledger pode rejeitar horário fora do funcionamento atual */
    }
    setPersistedSessions((prev) => {
      const exists = prev.some(
        (s) =>
          s.id === session.id ||
          (s.date === session.date &&
            s.time === session.time &&
            s.type === session.type),
      )
      if (exists) {
        return prev.map((s) =>
          s.id === session.id ||
          (s.date === session.date &&
            s.time === session.time &&
            s.type === session.type)
            ? { ...s, status }
            : s,
        )
      }
      return [...prev, { ...session, status }]
    })
    setDisplayTick((t) => t + 1)

    const persist =
      isDbSession(session)
        ? updateStudentSession(studentId, session.id, { status })
        : session.type === 'fixa'
          ? upsertFixedStudentSession(studentId, {
              date: session.date,
              time: session.time,
              weekday: session.weekday,
              status,
            }).then((saved) => {
              setPersistedSessions((prev) => {
                const withoutGenerated = prev.filter(
                  (s) =>
                    !(
                      s.date === session.date &&
                      s.time === session.time &&
                      s.type === 'fixa'
                    ),
                )
                return [...withoutGenerated, saved]
              })
              try {
                upsertAttendanceSession(saved)
              } catch {
                /* ledger local */
              }
              setDisplayTick((t) => t + 1)
              return saved
            })
          : null

    if (!persist) {
      toast.success('Presença atualizada', {
        description: `Status: ${status}`,
      })
      return
    }

    void persist
      .then(() => {
        toast.success('Presença atualizada', {
          description: `Status: ${status}`,
        })
      })
      .catch((error) => {
        setPersistedSessions((prev) =>
          prev.map((s) =>
            s.id === session.id ||
            (s.date === session.date &&
              s.time === session.time &&
              s.type === session.type)
              ? { ...s, status: previous }
              : s,
          ),
        )
        try {
          setAttendanceStatus({ ...session, status: previous }, previous)
        } catch {
          /* ignore */
        }
        setDisplayTick((t) => t + 1)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a presença',
        )
      })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Frequência e presença</CardTitle>
        </CardHeader>
      </Card>

      {scheduleComplete ? (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Aulas fixas"
          value={String(totalContractClasses)}
          hint={
            historyBounds.contractEnd
              ? `${formatShortDate(historyBounds.from)} — ${formatShortDate(historyBounds.contractEnd)}`
              : undefined
          }
        />
        <StatCard label="Presenças" value={String(stats.presentes)} />
        <StatCard
          label="Faltas"
          value={String(
            sessions.filter((s) => s.status === 'falta').length,
          )}
          accent={sessions.some((s) => s.status === 'falta')}
          hint="Geram direito a reposição"
        />
        <StatCard
          label="Canceladas"
          value={String(
            sessions.filter((s) => s.status === 'cancelada').length,
          )}
          accent={sessions.some((s) => s.status === 'cancelada')}
          hint="Geram direito a reposição"
        />
        <StatCard
          label="Já remarcadas"
          value={`${makeupAllowance.used}/${makeupAllowance.missed}`}
          hint={
            makeupAllowance.remaining > 0
              ? `${makeupAllowance.remaining} a remarcar`
              : 'Nada a remarcar'
          }
        />
      </div>
      ) : null}

      <AttendanceListCard
        title="Aulas fixas"
        incompleteMessage={
          weeklyLimit != null
            ? `Preencha a agenda fixa com ${weeklyLimit} dia(s) por semana (${activeSchedule.length}/${weeklyLimit}) para liberar o histórico.`
            : 'Inclua a agenda fixa para liberar o histórico de aulas.'
        }
        emptyMessage="Nenhuma aula fixa no período."
        scheduleComplete={scheduleComplete}
        hasSessions={fixedSessions.length > 0}
      >
        <SessionHistoryTable
          sessions={fixedSessions}
          makeupAllowance={makeupAllowance}
          onStatus={handleStatus}
          actionMode="status"
        />
      </AttendanceListCard>

      <AttendanceListCard
        title="Reposições"
        incompleteMessage="Complete a agenda fixa para liberar as reposições."
        emptyMessage="Nenhuma aula a remarcar."
        scheduleComplete={scheduleComplete}
        hasSessions={toRemakeSessions.length > 0}
      >
        <SessionHistoryTable
          sessions={toRemakeSessions}
          makeupAllowance={makeupAllowance}
          onRemake={openMakeupDialog}
          actionMode="remake"
        />
      </AttendanceListCard>

      <AttendanceListCard
        title="Aulas remarcadas"
        incompleteMessage="Complete a agenda fixa para liberar as aulas remarcadas."
        emptyMessage="Nenhuma aula remarcada no período."
        scheduleComplete={scheduleComplete}
        hasSessions={remadeSessions.length > 0}
      >
        <SessionHistoryTable
          sessions={remadeSessions}
          makeupAllowance={makeupAllowance}
          onStatus={handleStatus}
          actionMode="status"
        />
      </AttendanceListCard>

      <MakeupDialog
        studentId={studentId}
        schedule={schedule}
        remaining={makeupAllowance.remaining}
        contractFrom={historyBounds.from}
        contractTo={historyBounds.contractEnd ?? historyBounds.to}
        source={makeupSource}
        open={makeupOpen}
        onOpenChange={(next) => {
          setMakeupOpen(next)
          if (!next) setMakeupSource(null)
        }}
        onCreated={refresh}
      />

      <EditMakeupDialog
        studentId={studentId}
        schedule={schedule}
        contractFrom={historyBounds.from}
        contractTo={historyBounds.contractEnd ?? historyBounds.to}
        session={editingSession}
        onOpenChange={(open) => {
          if (!open) setEditingSession(null)
        }}
        onSaved={() => {
          setEditingSession(null)
          refresh()
        }}
      />
    </div>
  )
}

function AttendanceListCard({
  title,
  action,
  incompleteMessage,
  emptyMessage,
  scheduleComplete,
  hasSessions,
  children,
}: {
  title: string
  action?: ReactNode
  incompleteMessage: string
  emptyMessage: string
  scheduleComplete: boolean
  hasSessions: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>{title}</CardTitle>
        {action ?? null}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {!scheduleComplete ? (
          <p className="px-4 pb-6 text-center text-sm text-muted-foreground">
            {incompleteMessage}
          </p>
        ) : !hasSessions ? (
          <p className="px-4 pb-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function SessionHistoryTable({
  sessions,
  makeupAllowance,
  onStatus,
  onRemake,
  actionMode = 'status',
}: {
  sessions: ClassSession[]
  makeupAllowance: ReturnType<typeof getMakeupAllowance>
  onStatus?: (session: ClassSession, status: AttendanceStatus) => void
  onRemake?: (session: ClassSession) => void
  actionMode?: 'status' | 'remake'
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Data</TableHead>
          <TableHead>Dia</TableHead>
          <TableHead>Horário</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="pr-4 text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => {
          const needsMakeup = makeupAllowance.pendingMissed.some(
            (s) => s.id === session.id,
          )
          const failedMakeup = makeupAllowance.failedMakeups.some(
            (s) => s.id === session.id,
          )
          return (
            <TableRow
              key={session.id}
              className={
                actionMode === 'remake' ? 'bg-destructive/5' : undefined
              }
            >
              <TableCell className="whitespace-nowrap pl-4 text-sm">
                <span className="font-medium">
                  {formatShortDate(session.date)}
                </span>
                {actionMode === 'remake' && needsMakeup ? (
                  <span className="mt-0.5 block text-[11px] font-medium text-destructive">
                    A remarcar
                  </span>
                ) : null}
                {actionMode === 'remake' && failedMakeup ? (
                  <span className="mt-0.5 block text-[11px] font-medium text-destructive">
                    Reposição a reagendar
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {session.weekday}
              </TableCell>
              <TableCell className="tabular-nums text-sm">
                {session.time}
              </TableCell>
              <TableCell>
                <AttendanceBadge status={session.status} />
              </TableCell>
              <TableCell className="pr-4 text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  {actionMode === 'status' && onStatus
                    ? statusActions.map(({ status, label, icon: Icon }) => (
                        <Button
                          key={status}
                          type="button"
                          size="xs"
                          variant={
                            session.status === status ? 'secondary' : 'ghost'
                          }
                          disabled={session.status === status}
                          title={label}
                          onClick={() => onStatus(session, status)}
                        >
                          <Icon data-icon="inline-start" />
                          {label}
                        </Button>
                      ))
                    : null}
                  {actionMode === 'remake' && onRemake ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => onRemake(session)}
                    >
                      <RefreshCw data-icon="inline-start" />
                      {failedMakeup ? 'Reagendar' : 'Remarcar'}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function StatCard({
  label,
  value,
  hint,
  accent,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
  highlight?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-6">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`text-2xl font-semibold tabular-nums ${
            highlight
              ? 'text-chart-2'
              : accent
                ? 'text-destructive'
                : 'text-foreground'
          }`}
        >
          {value}
        </span>
        {hint ? (
          <span className="truncate text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MakeupDialog({
  studentId,
  schedule,
  remaining,
  contractFrom,
  contractTo,
  source,
  open,
  onOpenChange,
  onCreated,
}: {
  studentId: string
  schedule: ScheduleSlot[]
  remaining: number
  contractFrom: string
  contractTo: string
  source: ClassSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [date, setDate] = useState(() => toIsoDate(new Date()))
  const [time, setTime] = useState('08:00')
  const [notes, setNotes] = useState('')
  const [hoursTick, setHoursTick] = useState(0)
  const canMakeup = remaining > 0

  useEffect(() => {
    if (!open) return
    const today = toIsoDate(new Date())
    const preferred =
      today < contractFrom
        ? contractFrom
        : today > contractTo
          ? contractTo
          : today
    setDate(preferred)
    setNotes(
      source
        ? `Reposição da aula fixa de ${formatShortDate(source.date)} ${source.time} (${source.status === 'falta' ? 'falta' : 'cancelamento'})`
        : '',
    )
    void fetchStudioHours()
      .then((hours) => {
        replaceStudioHours(hours)
        setHoursTick((t) => t + 1)
      })
      .catch(() => {
        /* usa horários em memória */
      })
  }, [open, source, contractFrom, contractTo])

  const weekday = getWeekdayFromDate(parseIsoDate(date))
  const fixedTimesForDay = useMemo(() => {
    if (!weekday || !date) return new Set<string>()
    return new Set(
      scheduleSlotsOnDate(schedule, date)
        .filter((s) => s.weekday === weekday)
        .map((s) => s.time),
    )
  }, [schedule, weekday, date])

  const slotOptions = useMemo(() => {
    void hoursTick
    const base = !weekday ? getTimeSlots() : availableSlotsForWeekday(weekday)
    return base.filter((t) => !fixedTimesForDay.has(t))
  }, [weekday, hoursTick, fixedTimesForDay])

  const morningOptions = slotOptions.filter((t) => morningSlots.includes(t))
  const afternoonOptions = slotOptions.filter((t) =>
    afternoonSlots.includes(t),
  )

  useEffect(() => {
    if (slotOptions.length > 0 && !slotOptions.includes(time)) {
      setTime(slotOptions[0])
    }
  }, [slotOptions, time])

  function handleCreate() {
    if (!canMakeup) {
      toast.error('Reposição não permitida', {
        description:
          'Só é possível remarcar após falta ou cancelamento de aula fixa.',
      })
      return
    }
    if (!weekday) {
      toast.error('Data inválida')
      return
    }
    if (date < contractFrom || date > contractTo) {
      toast.error('Data fora da vigência', {
        description: `A reposição deve ficar entre ${formatShortDate(contractFrom)} e ${formatShortDate(contractTo)}.`,
      })
      return
    }
    if (weekday && fixedTimesForDay.has(time)) {
      toast.error('Horário da agenda fixa', {
        description:
          'Reposição não pode ser no mesmo dia e horário da grade fixa do aluno.',
      })
      return
    }
    if (!slotOptions.includes(time)) {
      toast.error('Horário fora do funcionamento do estúdio')
      return
    }
    void (async () => {
      try {
        const saved = await createStudentSession(studentId, {
          date,
          time,
          type: 'reposicao',
          status: 'agendada',
          notes: notes.trim() || undefined,
          professionalId: professionals[0]?.id,
        })
        try {
          upsertAttendanceSession(saved)
          // Garante que falta/cancelamento da aula de origem permanece no dia.
          if (
            source &&
            (source.status === 'falta' || source.status === 'cancelada')
          ) {
            upsertAttendanceSession(source)
          }
        } catch {
          /* ledger local */
        }
        onOpenChange(false)
        setNotes('')
        onCreated()
        toast.success('Reposição marcada', {
          description: source
            ? `Cobre a aula de ${formatShortDate(source.date)} ${source.time}`
            : undefined,
        })
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível marcar a reposição',
        )
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remarcar aula</DialogTitle>
          <DialogDescription>
            {source ? (
              <>
                Cobrindo a aula fixa de {formatShortDate(source.date)} às{' '}
                {source.time} ({source.status === 'falta' ? 'falta' : 'cancelamento'}
                ). Escolha outro dia ou um horário que não coincida com a aula
                fixa desse dia.
              </>
            ) : (
              <>
                {remaining} reposição
                {remaining === 1 ? '' : 'ões'} disponível
                {remaining === 1 ? '' : 'is'} · vigência{' '}
                {formatShortDate(contractFrom)} — {formatShortDate(contractTo)}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="makeup-date">Nova data</FieldLabel>
            <Input
              id="makeup-date"
              type="date"
              min={contractFrom}
              max={contractTo}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Novo horário</FieldLabel>
            {slotOptions.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Nenhum horário livre neste dia — a aula fixa ocupa o único
                slot disponível ou o estúdio está fechado. Escolha outro dia.
              </p>
            ) : (
              <Select value={time} onValueChange={(v) => setTime(v ?? '08:00')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {morningOptions.length > 0 ? (
                    <SelectGroup>
                      <SelectLabel>Manhã</SelectLabel>
                      {morningOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                  {afternoonOptions.length > 0 ? (
                    <SelectGroup>
                      <SelectLabel>Tarde</SelectLabel>
                      {afternoonOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="makeup-notes">Observação</FieldLabel>
            <Input
              id="makeup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canMakeup || slotOptions.length === 0}
          >
            Confirmar reposição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditMakeupDialog({
  studentId,
  schedule,
  contractFrom,
  contractTo,
  session,
  onOpenChange,
  onSaved,
}: {
  studentId: string
  schedule: ScheduleSlot[]
  contractFrom: string
  contractTo: string
  session: ClassSession | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const open = Boolean(session)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('08:00')
  const [notes, setNotes] = useState('')
  const [hoursTick, setHoursTick] = useState(0)

  useEffect(() => {
    if (!open || !session) return
    setDate(session.date)
    setTime(session.time)
    setNotes(session.notes ?? '')
    void fetchStudioHours()
      .then((hours) => {
        replaceStudioHours(hours)
        setHoursTick((t) => t + 1)
      })
      .catch(() => {
        /* usa horários em memória */
      })
  }, [open, session])

  const weekday = date ? getWeekdayFromDate(parseIsoDate(date)) : null
  const fixedTimesForDay = useMemo(() => {
    if (!weekday || !date) return new Set<string>()
    return new Set(
      scheduleSlotsOnDate(schedule, date)
        .filter((s) => s.weekday === weekday)
        .map((s) => s.time),
    )
  }, [schedule, weekday, date])

  const slotOptions = useMemo(() => {
    void hoursTick
    const base = !weekday ? getTimeSlots() : availableSlotsForWeekday(weekday)
    return base.filter((t) => !fixedTimesForDay.has(t) || t === session?.time)
  }, [weekday, hoursTick, fixedTimesForDay, session?.time])

  const morningOptions = slotOptions.filter((t) => morningSlots.includes(t))
  const afternoonOptions = slotOptions.filter((t) =>
    afternoonSlots.includes(t),
  )

  useEffect(() => {
    if (slotOptions.length > 0 && !slotOptions.includes(time)) {
      setTime(slotOptions[0])
    }
  }, [slotOptions, time])

  function handleSave() {
    if (!session) return
    if (!weekday) {
      toast.error('Data inválida')
      return
    }
    if (date < contractFrom || date > contractTo) {
      toast.error('Data fora da vigência', {
        description: `A reposição deve ficar entre ${formatShortDate(contractFrom)} e ${formatShortDate(contractTo)}.`,
      })
      return
    }
    if (!slotOptions.includes(time)) {
      toast.error('Horário inválido', {
        description:
          'Escolha um horário que não coincida com a aula fixa desse dia e que esteja dentro do funcionamento do estúdio.',
      })
      return
    }

    void updateStudentSession(studentId, session.id, {
      date,
      time,
      notes: notes.trim() || null,
      ...(session.status === 'falta' || session.status === 'cancelada'
        ? { status: 'agendada' as const }
        : {}),
    })
      .then((updated) => {
        try {
          upsertAttendanceSession(updated)
        } catch {
          /* ledger local */
        }
        toast.success(
          session.status === 'falta' || session.status === 'cancelada'
            ? 'Reposição reagendada'
            : 'Reposição atualizada',
          {
            description: `${formatShortDate(updated.date)} · ${updated.time}`,
          },
        )
        onSaved()
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível editar a reposição',
        )
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {session?.status === 'falta' || session?.status === 'cancelada'
              ? 'Reagendar reposição'
              : 'Editar reposição'}
          </DialogTitle>
          <DialogDescription>
            {session?.status === 'falta' || session?.status === 'cancelada'
              ? 'Escolha nova data e horário. A reposição permanece na grade com status agendada.'
              : 'Corrija a data ou o horário da reposição. Ela continua vinculada ao contrato atual e não pode coincidir com o dia e horário de uma aula fixa.'}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-makeup-date">Data</FieldLabel>
            <Input
              id="edit-makeup-date"
              type="date"
              min={contractFrom}
              max={contractTo}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Horário</FieldLabel>
            {slotOptions.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Nenhum horário livre neste dia. Escolha outra data.
              </p>
            ) : (
              <Select value={time} onValueChange={(v) => setTime(v ?? '08:00')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {morningOptions.length > 0 ? (
                    <SelectGroup>
                      <SelectLabel>Manhã</SelectLabel>
                      {morningOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                  {afternoonOptions.length > 0 ? (
                    <SelectGroup>
                      <SelectLabel>Tarde</SelectLabel>
                      {afternoonOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-makeup-notes">Observação</FieldLabel>
            <Input
              id="edit-makeup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!session || slotOptions.length === 0}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
