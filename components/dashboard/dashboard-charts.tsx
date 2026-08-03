'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  addDays,
  buildWeeklyAttendanceChart,
  getMonday,
  toIsoDate,
  upsertAttendanceSession,
  replaceStudentsInStore,
} from '@/lib/data'
import { fetchStudioSessions } from '@/lib/sessions-api'
import { fetchStudents } from '@/lib/students-api'

const attendanceConfig = {
  presencas: { label: 'Presenças', color: 'var(--chart-1)' },
  faltas: { label: 'Faltas', color: 'var(--chart-4)' },
} satisfies ChartConfig

const emptyWeek = () =>
  buildWeeklyAttendanceChart(getMonday(new Date()), [], new Date())

export function AttendanceChart({ refreshKey = 0 }: { refreshKey?: number }) {
  const today = useMemo(() => new Date(), [])
  const monday = useMemo(() => getMonday(today), [today])
  const [data, setData] = useState(emptyWeek)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const from = toIsoDate(monday)
    const to = toIsoDate(addDays(monday, 5))

    setLoading(true)
    void Promise.all([
      fetchStudents({ active: true }).catch(() => []),
      fetchStudioSessions({ from, to }).catch(() => []),
    ]).then(([students, sessions]) => {
      if (cancelled) return
      replaceStudentsInStore(students)
      for (const session of sessions) {
        try {
          upsertAttendanceSession(session)
        } catch {
          /* horário fora do funcionamento atual — ainda entra no merge */
        }
      }
      setData(buildWeeklyAttendanceChart(monday, sessions, today))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [monday, today, refreshKey])

  const weekLabel = useMemo(() => {
    const end = addDays(monday, 5)
    return `${toIsoDate(monday).slice(8, 10)}/${toIsoDate(monday).slice(5, 7)} – ${toIsoDate(end).slice(8, 10)}/${toIsoDate(end).slice(5, 7)}`
  }, [monday])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequência semanal</CardTitle>
        <CardDescription>
          {loading ? 'Carregando…' : `Presenças e faltas · ${weekLabel}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={attendanceConfig} className="h-[240px] w-full">
          <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={28}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="presencas"
              fill="var(--color-presencas)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="faltas"
              fill="var(--color-faltas)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
