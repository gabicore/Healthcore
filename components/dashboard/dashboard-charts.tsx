'use client'

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

const attendanceData = [
  { day: 'Seg', presencas: 18, faltas: 2 },
  { day: 'Ter', presencas: 22, faltas: 1 },
  { day: 'Qua', presencas: 20, faltas: 3 },
  { day: 'Qui', presencas: 24, faltas: 2 },
  { day: 'Sex', presencas: 19, faltas: 1 },
  { day: 'Sáb', presencas: 9, faltas: 0 },
]

const attendanceConfig = {
  presencas: { label: 'Presenças', color: 'var(--chart-1)' },
  faltas: { label: 'Faltas', color: 'var(--chart-4)' },
} satisfies ChartConfig

export function AttendanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequência semanal</CardTitle>
        <CardDescription>Presenças e faltas desta semana</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={attendanceConfig} className="h-[240px] w-full">
          <BarChart data={attendanceData} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} />
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
