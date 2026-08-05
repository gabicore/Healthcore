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
  UserX,
  X,
  CalendarClock,
} from 'lucide-react'
import { toast } from 'sonner'

import { NewAppointmentDialog } from '@/components/clinica/new-appointment-dialog'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
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
  fetchClinicalAttendances,
  updateClinicalAttendance,
} from '@/lib/clinical-attendances-api'
import {
  clinicalAttendanceStatusLabel,
  serviceCategoryLabel,
  type ClinicalAttendance,
  type ClinicalAttendanceStatus,
  type ServiceCategory,
} from '@/lib/clinic-types'
import {
  SLOT_CAPACITY,
  addDays,
  afternoonSlots,
  availableSlotsForWeekday,
  formatWeekRange,
  getMonday,
  getWeekColumns,
  morningSlots,
  replaceScheduleSlots,
  replaceStudioHours,
  toIsoDate,
  type WeekDayColumn,
} from '@/lib/data'
import { fetchStudioHours, fetchTimeSlots } from '@/lib/settings-api'
import { cn } from '@/lib/utils'

const statusActions: {
  status: ClinicalAttendanceStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { status: 'realizada', label: 'Marcar como realizada', icon: Check },
  { status: 'falta', label: 'Registrar falta', icon: UserX },
  { status: 'cancelada', label: 'Cancelar atendimento', icon: X },
  { status: 'agendada', label: 'Voltar para agendada', icon: CalendarClock },
]

function weekKey(monday: Date) {
  return toIsoDate(monday)
}

const categoryTone: Record<ServiceCategory, string> = {
  pilates: 'bg-primary/12 text-primary',
  fisioterapia: 'bg-chart-2/15 text-chart-2',
  massoterapia: 'bg-chart-3/20 text-chart-3',
  auriculoterapia: 'bg-chart-5/15 text-chart-5',
  avaliacao: 'bg-accent text-accent-foreground',
  experimental: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  outro: 'bg-muted text-muted-foreground',
}

function countActiveInSlot(
  appointments: ClinicalAttendance[],
  date: string,
  time: string,
) {
  return appointments.filter(
    (a) => a.date === date && a.time === time && a.status !== 'cancelada',
  ).length
}

export function ClinicWeeklyAgenda() {
  const today = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(today)
  const [monday, setMonday] = useState(() => getMonday(today))
  const [byWeek, setByWeek] = useState<Record<string, ClinicalAttendance[]>>({})
  const [slotVersion, setSlotVersion] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [booking, setBooking] = useState<{ date: string; time: string } | null>(
    null,
  )
  const [editing, setEditing] = useState<ClinicalAttendance | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<
    ServiceCategory | 'todas'
  >('todas')

  const key = weekKey(monday)
  const columns = useMemo(() => getWeekColumns(monday), [monday])
  const fromIso = columns[0]?.iso
  const toIso = columns[columns.length - 1]?.iso

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchStudioHours(), fetchTimeSlots()])
      .then(([hours, timeSlots]) => {
        if (cancelled) return
        replaceStudioHours(hours)
        replaceScheduleSlots(timeSlots)
        setSlotVersion((v) => v + 1)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!fromIso || !toIso) return
    let cancelled = false
    fetchClinicalAttendances({ from: fromIso, to: toIso })
      .then((list) => {
        if (!cancelled) setByWeek((prev) => ({ ...prev, [key]: list }))
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar a agenda clínica',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [fromIso, toIso, key])

  const appointments = useMemo(() => {
    const list = byWeek[key] ?? []
    if (categoryFilter === 'todas') return list
    return list.filter((a) => a.serviceCategory === categoryFilter)
  }, [byWeek, key, categoryFilter])

  const scheduleSlots = useMemo(() => {
    void slotVersion
    const set = new Set<string>()
    for (const column of columns) {
      for (const slot of availableSlotsForWeekday(column.weekday)) set.add(slot)
    }
    return [...morningSlots, ...afternoonSlots].filter((t) => set.has(t))
  }, [columns, slotVersion])

  const slotCapacity = useMemo(() => {
    void slotVersion
    return SLOT_CAPACITY
  }, [slotVersion])

  async function updateStatus(
    id: string,
    status: ClinicalAttendanceStatus,
  ) {
    try {
      const updated = await updateClinicalAttendance(id, { status })
      setByWeek((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).map((a) => (a.id === id ? updated : a)),
      }))
      toast.success(clinicalAttendanceStatusLabel[status])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar o status',
      )
    }
  }

  function handleSaved(saved: ClinicalAttendance) {
    const sessionMonday = getMonday(
      new Date(
        Number(saved.date.slice(0, 4)),
        Number(saved.date.slice(5, 7)) - 1,
        Number(saved.date.slice(8, 10)),
      ),
    )
    const targetKey = weekKey(sessionMonday)
    setByWeek((prev) => {
      const cleaned: Record<string, ClinicalAttendance[]> = {}
      for (const [week, list] of Object.entries(prev)) {
        cleaned[week] = list.filter((a) => a.id !== saved.id)
      }
      return {
        ...cleaned,
        [targetKey]: [...(cleaned[targetKey] ?? []), saved].sort((a, b) =>
          `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
        ),
      }
    })
    if (targetKey !== key) setMonday(sessionMonday)
    setBooking(null)
    setEditing(null)
    setDialogOpen(false)
  }

  function openEdit(attendance: ClinicalAttendance) {
    setEditing(attendance)
    setBooking(null)
    setDialogOpen(true)
  }

  function openBook(date: string, time: string) {
    setEditing(null)
    setBooking({ date, time })
    setDialogOpen(true)
  }

  const isCurrentWeek = key === weekKey(getMonday(today))

  return (
    <>
      <PageHeader
        title="Agenda clínica"
        description="Grade semanal de atendimentos clínicos"
      >
        <NewAppointmentDialog
          defaultDate={booking?.date ?? todayIso}
          defaultTime={booking?.time}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setBooking(null)
              setEditing(null)
            }
          }}
          editing={editing}
          hideTrigger={Boolean(editing) || Boolean(booking)}
          onSaved={handleSaved}
        />
      </PageHeader>

      <div className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonday(addDays(monday, -7))}
              aria-label="Semana anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonday(addDays(monday, 7))}
              aria-label="Próxima semana"
            >
              <ChevronRight />
            </Button>
            <span className="text-sm font-semibold tracking-tight">
              {formatWeekRange(monday)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                'todas',
                'fisioterapia',
                'massoterapia',
                'auriculoterapia',
                'avaliacao',
              ] as const
            ).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={categoryFilter === value ? 'default' : 'outline'}
                onClick={() => setCategoryFilter(value)}
              >
                {value === 'todas' ? 'Todas' : serviceCategoryLabel[value]}
              </Button>
            ))}
            {!isCurrentWeek ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonday(getMonday(today))}
              >
                Hoje
              </Button>
            ) : null}
          </div>
        </div>

        <Card className="hidden overflow-hidden py-0 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-20" />
                {columns.map((column) => (
                  <col key={column.iso} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground">
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
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {scheduleSlots.map((slot) => (
                  <tr key={slot} className="border-b align-top">
                    <td className="px-2 py-2 text-xs font-medium text-muted-foreground">
                      {slot}
                    </td>
                    {columns.map((column) => {
                      const dayOpen = availableSlotsForWeekday(
                        column.weekday,
                      ).includes(slot)
                      const cellItems = appointments
                        .filter(
                          (a) =>
                            a.date === column.iso &&
                            a.time === slot &&
                            a.status !== 'cancelada',
                        )
                        .sort((a, b) =>
                          (a.studentName ?? a.studentId).localeCompare(
                            b.studentName ?? b.studentId,
                          ),
                        )
                      const occupied = countActiveInSlot(
                        appointments,
                        column.iso,
                        slot,
                      )
                      const full = occupied >= slotCapacity
                      return (
                        <td
                          key={`${column.iso}-${slot}`}
                          className={cn(
                            'px-1 py-1',
                            column.iso === todayIso && 'bg-primary/5',
                            !dayOpen && 'bg-muted/30',
                          )}
                        >
                          <div className="flex min-h-14 flex-col gap-1">
                            {cellItems.map((a) => (
                              <AttendanceCard
                                key={a.id}
                                attendance={a}
                                onStatusChange={updateStatus}
                                onEdit={openEdit}
                              />
                            ))}
                            {dayOpen && !full ? (
                              <button
                                type="button"
                                onClick={() => openBook(column.iso, slot)}
                                className={cn(
                                  'flex flex-1 items-center justify-center rounded-md border border-dashed border-transparent p-1 text-muted-foreground transition hover:border-border',
                                  cellItems.length === 0
                                    ? 'opacity-0 hover:opacity-100 focus-visible:opacity-100'
                                    : 'opacity-70 hover:opacity-100',
                                )}
                                aria-label={`Marcar em ${column.iso} ${slot}`}
                              >
                                <Plus className="size-3.5" />
                                {cellItems.length > 0 ? (
                                  <span className="ml-1 text-[10px] tabular-nums">
                                    {occupied}/{slotCapacity}
                                  </span>
                                ) : null}
                              </button>
                            ) : null}
                            {dayOpen && full ? (
                              <span className="px-1 text-[10px] text-muted-foreground tabular-nums">
                                {occupied}/{slotCapacity}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-4 lg:hidden">
          {columns.map((column) => (
            <ClinicDayCard
              key={column.iso}
              column={column}
              todayIso={todayIso}
              appointments={appointments}
              capacity={slotCapacity}
              onBook={openBook}
              onEdit={openEdit}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function AttendanceCard({
  attendance,
  onStatusChange,
  onEdit,
}: {
  attendance: ClinicalAttendance
  onStatusChange: (
    id: string,
    status: ClinicalAttendanceStatus,
  ) => void | Promise<void>
  onEdit: (attendance: ClinicalAttendance) => void
}) {
  const displayName = attendance.studentName?.trim() || 'Pessoa'
  const shortName = displayName.split(' ').slice(0, 2).join(' ')
  const category = attendance.serviceCategory ?? 'outro'
  const badgeLabel =
    attendance.serviceName ?? serviceCategoryLabel[category]

  return (
    <div className="rounded-md border bg-card px-1.5 py-1 text-left shadow-sm">
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Link
            href={`/alunos/${attendance.studentId}`}
            className="min-w-0 truncate text-xs font-medium hover:underline"
            title={displayName}
          >
            {shortName}
          </Link>
          <Badge
            variant="outline"
            className={cn(
              'h-4 shrink-0 border-transparent px-1 text-[10px]',
              categoryTone[category],
            )}
          >
            {badgeLabel}
          </Badge>
        </div>
        <AttendanceMenu
          attendance={attendance}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
        />
      </div>
    </div>
  )
}

function ClinicDayCard({
  column,
  todayIso,
  appointments,
  capacity,
  onBook,
  onEdit,
  onStatusChange,
}: {
  column: WeekDayColumn
  todayIso: string
  appointments: ClinicalAttendance[]
  capacity: number
  onBook: (date: string, time: string) => void
  onEdit: (attendance: ClinicalAttendance) => void
  onStatusChange: (
    id: string,
    status: ClinicalAttendanceStatus,
  ) => void | Promise<void>
}) {
  const isToday = column.iso === todayIso
  const daySlots = availableSlotsForWeekday(column.weekday)
  const dayItems = appointments.filter(
    (a) => a.date === column.iso && a.status !== 'cancelada',
  )

  return (
    <Card className={cn(isToday && 'ring-1 ring-primary/25')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {column.weekday}{' '}
            <span className="font-normal text-muted-foreground">
              {column.dayNumber} {column.monthLabel}
            </span>
          </CardTitle>
          <Badge variant="secondary">{dayItems.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {daySlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Estúdio fechado</p>
        ) : (
          daySlots.map((slot) => {
            const slotItems = dayItems
              .filter((a) => a.time === slot)
              .sort((a, b) =>
                (a.studentName ?? a.studentId).localeCompare(
                  b.studentName ?? b.studentId,
                ),
              )
            const occupied = countActiveInSlot(appointments, column.iso, slot)
            const full = occupied >= capacity
            return (
              <div
                key={slot}
                className="flex items-start gap-3 rounded-lg border p-2"
              >
                <div className="flex w-12 shrink-0 flex-col gap-1 pt-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {slot}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {occupied}/{capacity}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {slotItems.map((a) => (
                    <AttendanceCard
                      key={a.id}
                      attendance={a}
                      onStatusChange={onStatusChange}
                      onEdit={onEdit}
                    />
                  ))}
                  {!full ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start text-muted-foreground"
                      onClick={() => onBook(column.iso, slot)}
                    >
                      <Plus data-icon="inline-start" />
                      Marcar
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function AttendanceMenu({
  attendance,
  onStatusChange,
  onEdit,
}: {
  attendance: ClinicalAttendance
  onStatusChange: (
    id: string,
    status: ClinicalAttendanceStatus,
  ) => void | Promise<void>
  onEdit: (attendance: ClinicalAttendance) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="size-6 shrink-0">
            <MoreHorizontal className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Atendimento</DropdownMenuLabel>
          {statusActions.map((action) => (
            <DropdownMenuItem
              key={action.status}
              disabled={attendance.status === action.status}
              onClick={() => void onStatusChange(attendance.id, action.status)}
            >
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onEdit(attendance)}>
            <Pencil />
            Editar atendimento
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
