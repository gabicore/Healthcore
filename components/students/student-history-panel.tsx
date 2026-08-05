'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AttendanceBadge } from '@/components/status-badges'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  clinicalAttendanceStatusLabel,
  serviceCategoryLabel,
  type ClinicalAttendance,
} from '@/lib/clinic-types'
import { fetchClinicalAttendances } from '@/lib/clinical-attendances-api'
import {
  formatShortDate,
  getAttendanceStats,
  type ClassSession,
  type Student,
} from '@/lib/data'
import { fetchStudentSessions } from '@/lib/sessions-api'

export function StudentHistoryPanel({ student }: { student: Student }) {
  const [pilates, setPilates] = useState<ClassSession[]>([])
  const [clinic, setClinic] = useState<ClinicalAttendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      fetchStudentSessions(student.id),
      fetchClinicalAttendances({ studentId: student.id }),
    ])
      .then(([sessions, attendances]) => {
        if (cancelled) return
        setPilates(
          sessions
            .slice()
            .sort((a, b) =>
              `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
            ),
        )
        setClinic(
          attendances
            .slice()
            .sort((a, b) =>
              `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
            )
            .slice(0, 30),
        )
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o histórico',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student.id])

  const pilatesStats = useMemo(() => getAttendanceStats(pilates), [pilates])
  const pilatesPreview = pilates.slice(0, 30)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Histórico unificado</CardTitle>
          <CardDescription>
            Pilates, atendimentos clínicos e atalhos do cadastro
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Avaliações: {student.assessments.length}</span>
          <span>·</span>
          <span>Evoluções: {student.evolutions.length}</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Aulas de Pilates</CardTitle>
            {!loading ? (
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {pilatesStats.presentes}{' '}
                {pilatesStats.presentes === 1 ? 'presente' : 'presentes'}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : pilatesPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma aula registrada.
              </p>
            ) : (
              <ul className="divide-y">
                {pilatesPreview.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatShortDate(s.date)} · {s.time}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.type}</p>
                    </div>
                    <AttendanceBadge status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atendimentos clínicos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : clinic.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum atendimento clínico.
              </p>
            ) : (
              <ul className="divide-y">
                {clinic.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatShortDate(a.date)} · {a.time}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.serviceName ??
                          (a.serviceCategory
                            ? serviceCategoryLabel[a.serviceCategory]
                            : 'Serviço')}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {clinicalAttendanceStatusLabel[a.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
