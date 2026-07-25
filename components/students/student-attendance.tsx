'use client'

import { useMemo, useState } from 'react'
import { Check, RefreshCw, UserX, X, CalendarPlus } from 'lucide-react'
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
  DialogTrigger,
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
  createMakeupSession,
  formatShortDate,
  getAttendanceStats,
  getStudent,
  getStudentAttendanceHistory,
  getWeekdayFromDate,
  morningSlots,
  parseIsoDate,
  planTotalClasses,
  professionals,
  setAttendanceStatus,
  getTimeSlots,
  toIsoDate,
  type AttendanceStatus,
  type ClassSession,
  type ClassSessionType,
} from '@/lib/data'

const statusActions: {
  status: AttendanceStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { status: 'presente', label: 'Presente', icon: Check },
  { status: 'falta', label: 'Falta', icon: UserX },
  { status: 'reposicao', label: 'Reposição', icon: RefreshCw },
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
}

export function StudentAttendancePanel({
  studentId,
}: StudentAttendancePanelProps) {
  const [version, setVersion] = useState(0)

  const sessions = useMemo(() => {
    void version
    return getStudentAttendanceHistory(studentId, 8)
  }, [studentId, version])

  const stats = useMemo(() => getAttendanceStats(sessions), [sessions])

  const totalPlanClasses = useMemo(() => {
    const student = getStudent(studentId)
    return student ? planTotalClasses(student.planId) : 0
  }, [studentId])

  function refresh() {
    setVersion((v) => v + 1)
  }

  function handleStatus(session: ClassSession, status: AttendanceStatus) {
    setAttendanceStatus(session, status)
    refresh()
    toast.success('Presença atualizada', {
      description: `Status: ${status}`,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Frequência e presença</h3>
          <p className="text-sm text-muted-foreground">
            Últimas 8 semanas · reposição não conta no limite do plano
          </p>
        </div>
        <MakeupDialog studentId={studentId} onCreated={refresh} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Aulas totais do plano" value={String(totalPlanClasses)} />
        <StatCard label="Presenças" value={String(stats.presentes)} />
        <StatCard label="Faltas" value={String(stats.faltas)} accent />
        <StatCard label="Reposições" value={String(stats.reposicoes)} />
        <StatCard
          label="Frequência"
          value={`${stats.rate}%`}
          highlight={stats.rate >= 80}
        />
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Histórico de aulas</CardTitle>
          <CardDescription>
            Atualize a presença de cada aula ou marque uma reposição
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma aula no período. Defina a agenda fixa ou marque uma
              reposição.
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
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{formatShortDate(session.date)}</span>
                        <span className="text-xs text-muted-foreground">
                          {session.weekday}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {session.time}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel[session.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <AttendanceBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {statusActions.map((action) => (
                          <Button
                            key={action.status}
                            type="button"
                            size="xs"
                            variant={
                              session.status === action.status
                                ? 'secondary'
                                : 'ghost'
                            }
                            disabled={session.status === action.status}
                            onClick={() =>
                              handleStatus(session, action.status)
                            }
                            title={action.label}
                          >
                            <action.icon />
                            <span className="hidden sm:inline">
                              {action.label}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string
  value: string
  accent?: boolean
  highlight?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-2xl font-semibold tracking-tight ${
            accent
              ? 'text-destructive'
              : highlight
                ? 'text-primary'
                : ''
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function MakeupDialog({
  studentId,
  onCreated,
}: {
  studentId: string
  onCreated: () => void
}) {
  const todayIso = toIsoDate(new Date())
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayIso)
  const [time, setTime] = useState('08:00')
  const [professionalId, setProfessionalId] = useState(professionals[0].id)
  const [notes, setNotes] = useState('')

  const weekday = useMemo(() => {
    if (!date) return null
    return getWeekdayFromDate(parseIsoDate(date))
  }, [date])

  const slots = useMemo(() => {
    if (!weekday) return getTimeSlots()
    return availableSlotsForWeekday(weekday)
  }, [weekday])

  const morningOptions = slots.filter((t) => morningSlots.includes(t))
  const afternoonOptions = slots.filter((t) => afternoonSlots.includes(t))

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setDate(todayIso)
      setTime(slots[0] ?? '08:00')
      setNotes('')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!weekday) {
      toast.error('Escolha um dia útil (segunda a sábado)')
      return
    }
    if (!slots.includes(time)) {
      toast.error('Horário indisponível neste dia')
      return
    }

    const session = createMakeupSession({
      studentId,
      date,
      time,
      notes: notes.trim() || undefined,
      professionalId,
    })

    if (!session) {
      toast.error('Não foi possível agendar a reposição')
      return
    }

    handleOpenChange(false)
    onCreated()
    toast.success('Reposição agendada', {
      description: `${formatShortDate(date)} às ${time}`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <RefreshCw data-icon="inline-start" />
            Marcar reposição
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reposição de aula</DialogTitle>
          <DialogDescription>
            Aula extra fora da grade fixa. Não conta no limite do plano.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="makeup-date">Data</FieldLabel>
                <Input
                  id="makeup-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Dia</FieldLabel>
                <Input
                  readOnly
                  value={weekday ?? 'Domingo'}
                  className="bg-muted"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Horário</FieldLabel>
              <Select
                value={time}
                onValueChange={(v) => setTime(v ?? slots[0] ?? '08:00')}
              >
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
            </Field>
            <Field>
              <FieldLabel>Profissional</FieldLabel>
              <Select
                value={professionalId}
                onValueChange={(v) =>
                  setProfessionalId(v ?? professionals[0].id)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="makeup-notes">Observação</FieldLabel>
              <Input
                id="makeup-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: reposição da falta de terça"
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6" showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar reposição</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
