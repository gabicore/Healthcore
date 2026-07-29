'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarClock,
  FlaskConical,
  NotebookPen,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { AttendanceChart } from '@/components/dashboard/dashboard-charts'
import { NewClassDialog } from '@/components/agenda/new-class-dialog'
import { AttendanceBadge } from '@/components/status-badges'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  students,
  classSessionTypeLabel,
  formatCurrency,
  formatShortDate,
  formatWeekdayLabel,
  getDayExperimentalSessions,
  getDayLatestEvolutions,
  getDaySessions,
  getStudent,
  getWeekdayFromDate,
  initials,
  sessionParticipantName,
  toIsoDate,
  upsertAttendanceSession,
  type ClassSession,
} from '@/lib/data'

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const today = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(today)
  const todayWeekday = getWeekdayFromDate(today)
  const [agendaTick, setAgendaTick] = useState(0)

  const pendingPayments = students.flatMap((s) =>
    s.payments
      .filter((p) => p.status === 'pendente' || p.status === 'atrasado')
      .map((p) => ({ student: s, payment: p })),
  )
  const pendingTotal = pendingPayments.reduce(
    (sum, p) => sum + p.payment.amount,
    0,
  )

  const todayAgenda = useMemo(() => {
    void agendaTick
    return getDaySessions(today)
  }, [today, agendaTick])

  const experimentalToday = useMemo(() => {
    void agendaTick
    return getDayExperimentalSessions(today)
  }, [today, agendaTick])

  const dayEvolutions = useMemo(() => getDayLatestEvolutions(today), [today])

  const dayHint = todayWeekday
    ? formatWeekdayLabel(todayWeekday)
    : 'Domingo · sem aulas'

  function handleCreateExperimental(session: ClassSession) {
    try {
      upsertAttendanceSession(session)
      setAgendaTick((n) => n + 1)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível agendar neste horário',
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu estúdio"
      >
        <Button size="sm" nativeButton={false} render={<Link href="/alunos" />}>
          <Users data-icon="inline-start" />
          Ver alunos
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Aulas hoje"
            value={String(todayAgenda.length)}
            hint={`${dayHint} · ${formatShortDate(todayIso)}`}
            icon={CalendarClock}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <CardTitle>Aulas experimentais</CardTitle>
                <CardDescription>
                  Clientes em aula teste · {dayHint}
                </CardDescription>
              </div>
              <FlaskConical className="size-5 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!todayWeekday ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Sem aulas aos domingos.
                </p>
              ) : experimentalToday.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Nenhuma aula experimental marcada para hoje.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {experimentalToday.map((session) => {
                    const name = sessionParticipantName(session)
                    const student = getStudent(session.studentId)
                    const content = (
                      <>
                        <Badge
                          variant="outline"
                          className="font-mono tabular-nums"
                        >
                          {session.time}
                        </Badge>
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {session.notes || 'Cliente experimental'}
                          </p>
                        </div>
                        <AttendanceBadge status={session.status} />
                      </>
                    )
                    return student ? (
                      <Link
                        key={session.id}
                        href={`/alunos/${student.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-2"
                      >
                        {content}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <NewClassDialog
                  defaultType="experimental"
                  defaultDate={todayIso}
                  triggerLabel="Nova experimental"
                  title="Aula experimental"
                  description="Cadastre um cliente em aula teste. Pode informar só o nome ou vincular a um aluno já cadastrado."
                  sessions={todayAgenda}
                  onCreate={handleCreateExperimental}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/agenda" />}
                >
                  Ver na grade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <CardTitle>Agenda do dia</CardTitle>
                <CardDescription>
                  {dayHint} · grade sincronizada
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/agenda" />}
              >
                Ver grade
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {!todayWeekday ? (
                <p className="py-4 text-sm text-muted-foreground">
                  O estúdio não funciona aos domingos.
                </p>
              ) : todayAgenda.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Nenhuma aula na grade para hoje.
                </p>
              ) : (
                todayAgenda.map((session) => {
                  const name = sessionParticipantName(session)
                  const student = getStudent(session.studentId)
                  const row = (
                    <>
                      <Badge
                        variant="outline"
                        className="font-mono tabular-nums"
                      >
                        {session.time}
                      </Badge>
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        {session.type !== 'fixa' ? (
                          <p className="text-[11px] text-muted-foreground">
                            {classSessionTypeLabel[session.type]}
                          </p>
                        ) : null}
                      </div>
                      <AttendanceBadge status={session.status} />
                    </>
                  )
                  return student ? (
                    <Link
                      key={session.id}
                      href={`/alunos/${student.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2"
                    >
                      {row}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Últimas evoluções</CardTitle>
                <CardDescription>Alunos da grade de hoje</CardDescription>
              </div>
              <NotebookPen className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col">
              {!todayWeekday ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Sem aulas hoje — evoluções aparecem com a grade.
                </p>
              ) : dayEvolutions.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Nenhum aluno na grade para hoje.
                </p>
              ) : (
                dayEvolutions.map(({ student, evolution, time }, i) => (
                  <div key={student.id}>
                    {i > 0 ? <Separator className="my-1" /> : null}
                    <Link
                      href={`/alunos/${student.id}`}
                      className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <Badge
                        variant="outline"
                        className="mt-0.5 font-mono tabular-nums"
                      >
                        {time}
                      </Badge>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {student.name}
                          </span>
                          {evolution ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatShortDate(evolution.date).slice(0, 5)}
                            </span>
                          ) : null}
                        </div>
                        {evolution ? (
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {evolution.clinical}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sem evolução registrada
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <AttendanceChart />

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                Gerencie os pagamentos em atraso
              </span>
              <span className="text-sm text-muted-foreground">
                {pendingPayments.length} cobrança(s) aguardando —{' '}
                {formatCurrency(pendingTotal)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/financeiro" />}
            >
              <Wallet data-icon="inline-start" />
              Ir para o financeiro
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
