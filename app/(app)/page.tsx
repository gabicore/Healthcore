'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  NotebookPen,
  Users,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { AttendanceChart } from '@/components/dashboard/dashboard-charts'
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
  getDaySessions,
  getStudent,
  getWeekdayFromDate,
  initials,
  sessionParticipantName,
  replaceStudentsInStore,
} from '@/lib/data'
import { fetchStudents } from '@/lib/students-api'

export default function DashboardPage() {
  const today = useMemo(() => new Date(), [])
  const todayWeekday = getWeekdayFromDate(today)
  const [agendaTick, setAgendaTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetchStudents({ active: true })
      .then((list) => {
        if (cancelled) return
        replaceStudentsInStore(list)
        setAgendaTick((n) => n + 1)
      })
      .catch(() => {
        /* mantém store em memória */
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  /** Mesma ordem/alunos da agenda do dia (1 entrada por aluno). */
  const dayEvolutions = useMemo(() => {
    const seen = new Set<string>()
    const rows: {
      student: NonNullable<ReturnType<typeof getStudent>>
      evolution: NonNullable<
        NonNullable<ReturnType<typeof getStudent>>['evolutions']
      >[number] | null
      time: string
    }[] = []
    for (const session of todayAgenda) {
      if (!session.studentId || seen.has(session.studentId)) continue
      const student = getStudent(session.studentId)
      if (!student) continue
      seen.add(session.studentId)
      const evolution =
        student.evolutions
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
      rows.push({ student, evolution, time: session.time })
    }
    return rows
  }, [todayAgenda])

  const dayHint = todayWeekday
    ? formatWeekdayLabel(todayWeekday)
    : 'Domingo · sem aulas'

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu estúdio"
      >
        <Button size="sm" nativeButton={false} render={<Link href="/alunos" />}>
          <Users data-icon="inline-start" />
          Ver pessoas
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
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
              <CardTitle>Últimas evoluções</CardTitle>
              <NotebookPen className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col">
              {!todayWeekday ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Sem aulas.
                </p>
              ) : dayEvolutions.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Nenhuma pessoa na agenda de hoje.
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
                            Sem evolução
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

        <AttendanceChart refreshKey={agendaTick} />

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
