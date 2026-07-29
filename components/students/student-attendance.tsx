'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, RefreshCw, UserX, X, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'

import { AttendanceBadge } from '@/components/status-badges'
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
  formatShortDate,
  getAttendanceStats,
  getMakeupAllowance,
  getStudentAttendanceHistory,
  getWeekdayFromDate,
  morningSlots,
  parseIsoDate,
  professionals,
  replaceStudioHours,
  setAttendanceStatus,
  getTimeSlots,
  toIsoDate,
  upsertAttendanceSession,
  type AttendanceStatus,
  type ClassSession,
  type ClassSessionType,
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

const typeLabel: Record<ClassSessionType, string> = {
  fixa: 'Fixa',
  avulsa: 'Avulsa',
  reposicao: 'Reposição',
  experimental: 'Experimental',
}

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
  const scheduleComplete =
    weeklyLimit != null && schedule.length >= weeklyLimit
  const scheduleRemaining =
    weeklyLimit != null ? Math.max(0, weeklyLimit - schedule.length) : 0

  const sessions = useMemo(() => {
    void displayTick
    // Só gera histórico quando todos os horários da agenda fixa estão definidos.
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

  /** Sempre igual às aulas fixas listadas no histórico (mesma geração). */
  const totalContractClasses = fixedSessions.length

  const makeupAllowance = useMemo(
    () =>
      getMakeupAllowance(sessions, {
        fromDate: historyBounds.from,
        toDate: historyBounds.contractEnd ?? historyBounds.to,
      }),
    [sessions, historyBounds],
  )

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Frequência e presença</h3>
          <p className="text-sm text-muted-foreground">
            {!scheduleComplete
              ? weeklyLimit != null
                ? `Complete a agenda fixa (${schedule.length}/${weeklyLimit} horário${weeklyLimit === 1 ? '' : 's'}) para liberar o histórico.`
                : 'Defina o plano do contrato e a agenda fixa para liberar o histórico.'
              : (
                <>
                  Vigência {formatShortDate(historyBounds.from)}
                  {historyBounds.contractEnd
                    ? ` — ${formatShortDate(historyBounds.contractEnd)}`
                    : ''}
                  {' · '}
                  {totalContractClasses} aulas fixas
                  {makeupAllowance.remaining > 0
                    ? ` · ${makeupAllowance.remaining} a remarcar`
                    : ''}
                  {contractPlan ? ` · ${contractPlan.frequencyLabel}` : null}
                </>
              )}
          </p>
        </div>
      </div>

      {scheduleComplete ? (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
          label="Faltas / canceladas"
          value={String(makeupAllowance.missed)}
          accent={makeupAllowance.missed > 0}
          hint="Geram direito a reposição"
        />
        <StatCard
          label="A remarcar"
          value={String(makeupAllowance.remaining)}
          accent={makeupAllowance.remaining > 0}
          hint={
            makeupAllowance.remaining > 0
              ? 'Reposições ainda pendentes'
              : 'Nada pendente'
          }
        />
        <StatCard
          label="Já remarcadas"
          value={String(makeupAllowance.used)}
          hint={`${makeupAllowance.used}/${makeupAllowance.missed || 0} cobertas`}
        />
      </div>
      ) : null}

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Histórico de aulas</CardTitle>
          <CardDescription>
            {!scheduleComplete
              ? weeklyLimit != null
                ? `Faltam ${scheduleRemaining} horário${scheduleRemaining === 1 ? '' : 's'} na agenda fixa (${schedule.length}/${weeklyLimit}).`
                : 'O histórico só é liberado com a agenda fixa completa.'
              : 'Marque presença, falta ou cancelamento nas aulas fixas. Reposição só nasce de falta/cancelamento.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!scheduleComplete ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {weeklyLimit != null
                ? `Selecione todos os ${weeklyLimit} horário(s) da agenda fixa (${schedule.length}/${weeklyLimit}) para gerar o histórico de aulas.`
                : 'Complete a agenda fixa do plano para gerar o histórico de aulas.'}
            </p>
          ) : sessions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma aula no período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const needsMakeup = makeupAllowance.pendingMissed.some(
                    (s) => s.id === session.id,
                  )
                  const wasCovered = makeupAllowance.coveredMissed.some(
                    (s) => s.id === session.id,
                  )
                  return (
                  <TableRow
                    key={session.id}
                    className={
                      needsMakeup
                        ? 'bg-destructive/5'
                        : session.type === 'reposicao'
                          ? 'bg-muted/40'
                          : undefined
                    }
                  >
                    <TableCell className="whitespace-nowrap text-sm">
                      <span className="font-medium">
                        {formatShortDate(session.date)}
                      </span>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {session.weekday}
                      </span>
                      {needsMakeup ? (
                        <span className="mt-0.5 block text-[11px] font-medium text-destructive">
                          A remarcar
                        </span>
                      ) : null}
                      {wasCovered ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          Já coberta por reposição
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {session.time}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {typeLabel[session.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AttendanceBadge status={session.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {statusActions.map(({ status, label, icon: Icon }) => (
                          <Button
                            key={status}
                            type="button"
                            size="xs"
                            variant={
                              session.status === status ? 'secondary' : 'ghost'
                            }
                            disabled={session.status === status}
                            title={label}
                            onClick={() => handleStatus(session, status)}
                          >
                            <Icon data-icon="inline-start" />
                            {label}
                          </Button>
                        ))}
                        {session.type === 'reposicao' ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => setEditingSession(session)}
                          >
                            <Pencil data-icon="inline-start" />
                            Editar
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {scheduleComplete ? (
        <MakeupSummaryCard
          studentId={studentId}
          schedule={schedule}
          allowance={makeupAllowance}
          contractFrom={historyBounds.from}
          contractTo={historyBounds.contractEnd ?? historyBounds.to}
          onCreated={refresh}
        />
      ) : null}

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
    <Card className="gap-1 py-3">
      <CardContent className="px-4 py-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-2xl font-semibold tabular-nums ${
            highlight
              ? 'text-chart-2'
              : accent
                ? 'text-destructive'
                : 'text-foreground'
          }`}
        >
          {value}
        </p>
        {hint ? (
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MakeupSummaryCard({
  studentId,
  schedule,
  allowance,
  contractFrom,
  contractTo,
  onCreated,
}: {
  studentId: string
  schedule: ScheduleSlot[]
  allowance: ReturnType<typeof getMakeupAllowance>
  contractFrom: string
  contractTo: string
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<ClassSession | null>(null)

  function openFor(session?: ClassSession) {
    if (allowance.remaining <= 0) {
      toast.error('Nada a remarcar', {
        description:
          allowance.missed === 0
            ? 'Marque falta ou cancelamento em uma aula fixa para liberar reposição.'
            : 'Todas as faltas/cancelamentos deste contrato já foram remarcados.',
      })
      return
    }
    setSource(session ?? allowance.pendingMissed[0] ?? null)
    setOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Reposições</CardTitle>
              <CardDescription>
                Só para aulas fixas com falta ou cancelamento. Saldo:{' '}
                <span className="font-medium text-foreground">
                  {allowance.remaining} a remarcar
                </span>
                {' · '}
                {allowance.used} já remarcada
                {allowance.used === 1 ? '' : 's'}
                {' · '}
                {allowance.missed} falta
                {allowance.missed === 1 ? '' : 's'}/cancelamento
                {allowance.missed === 1 ? '' : 's'}
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={allowance.remaining <= 0}
              onClick={() => openFor()}
            >
              <RefreshCw data-icon="inline-start" />
              Remarcar aula
              {allowance.remaining > 0 ? ` (${allowance.remaining})` : ''}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {allowance.pendingMissed.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              {allowance.missed === 0
                ? 'Nenhuma aula fixa com falta ou cancelamento. Quando houver, o botão Remarcar libera automaticamente.'
                : 'Todas as faltas/cancelamentos já têm reposição marcada.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {allowance.pendingMissed.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatShortDate(session.date)} · {session.time} ·{' '}
                      {session.weekday}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aula fixa com{' '}
                      {session.status === 'falta' ? 'falta' : 'cancelamento'} —
                      precisa de reposição
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openFor(session)}
                  >
                    <RefreshCw data-icon="inline-start" />
                    Remarcar esta
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {allowance.makeups.length > 0 ? (
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Reposições já marcadas
              </p>
              <ul className="flex flex-col gap-1.5">
                {allowance.makeups.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {formatShortDate(session.date)} · {session.time}
                      {session.notes ? (
                        <span className="text-muted-foreground">
                          {' '}
                          — {session.notes}
                        </span>
                      ) : null}
                    </span>
                    <AttendanceBadge status={session.status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <MakeupDialog
        studentId={studentId}
        schedule={schedule}
        remaining={allowance.remaining}
        contractFrom={contractFrom}
        contractTo={contractTo}
        source={source}
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setSource(null)
        }}
        onCreated={onCreated}
      />
    </>
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
    if (!weekday) return new Set<string>()
    return new Set(
      schedule.filter((s) => s.weekday === weekday).map((s) => s.time),
    )
  }, [schedule, weekday])

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
                ). Escolha um horário diferente da grade fixa.
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
                Nenhum horário livre neste dia — a agenda fixa ocupa os slots ou
                o estúdio está fechado. Escolha outro dia.
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
    if (!weekday) return new Set<string>()
    return new Set(
      schedule.filter((s) => s.weekday === weekday).map((s) => s.time),
    )
  }, [schedule, weekday])

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
          'Escolha um horário fora da grade fixa do aluno e dentro do funcionamento do estúdio.',
      })
      return
    }

    void updateStudentSession(studentId, session.id, {
      date,
      time,
      notes: notes.trim() || null,
    })
      .then((updated) => {
        try {
          upsertAttendanceSession(updated)
        } catch {
          /* ledger local */
        }
        toast.success('Reposição atualizada', {
          description: `${formatShortDate(updated.date)} · ${updated.time}`,
        })
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
          <DialogTitle>Editar reposição</DialogTitle>
          <DialogDescription>
            Corrija a data ou o horário da reposição. Ela continua vinculada ao
            contrato atual e não pode ocupar um slot da agenda fixa.
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
