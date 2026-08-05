'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { InlineField } from '@/components/students/inline-field'
import { InlineCell } from '@/components/financeiro/inline-cell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
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
  weekdays,
  type StudioHour,
  type Weekday,
  replaceScheduleSlots,
  replaceStudioHours,
} from '@/lib/data'
import type { TimeSlotDto } from '@/lib/validations/settings'
import {
  createTimeSlot,
  deleteTimeSlot,
  fetchStudioHours,
  fetchTimeSlots,
  updateStudioHour,
  updateTimeSlot,
} from '@/lib/settings-api'

const TIME_RE = /^\d{2}:\d{2}$/

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function periodForTime(time: string): 'manha' | 'tarde' {
  const hour = Number(time.slice(0, 2))
  return Number.isFinite(hour) && hour < 13 ? 'manha' : 'tarde'
}

function normalizeTimeInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (TIME_RE.test(trimmed)) return trimmed
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function HoursSettingsPage() {
  const [hours, setHours] = useState<StudioHour[] | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlotDto[]>([])
  const [newSlotTime, setNewSlotTime] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)

  const morning = useMemo(
    () =>
      timeSlots
        .filter((s) => s.period === 'manha')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [timeSlots],
  )

  const afternoon = useMemo(
    () =>
      timeSlots
        .filter((s) => s.period === 'tarde')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [timeSlots],
  )

  const capacity = timeSlots[0]?.capacity ?? 4

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [studioHours, slots] = await Promise.all([
          fetchStudioHours(),
          fetchTimeSlots(),
        ])
        if (cancelled) return
        setHours(studioHours)
        replaceStudioHours(studioHours)
        setTimeSlots(slots)
        replaceScheduleSlots(slots)
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            errorMessage(err, 'Não foi possível carregar os horários'),
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function notify(label: string) {
    toast.success(`${label} atualizado`, { duration: 1800 })
  }

  async function reloadTimeSlots() {
    const slots = await fetchTimeSlots()
    setTimeSlots(slots)
    replaceScheduleSlots(slots)
  }

  async function reloadHours() {
    const next = await fetchStudioHours()
    setHours(next)
    replaceStudioHours(next)
  }

  if (!hours) {
    return (
      <>
        <PageHeader
          title="Horários de funcionamento"
          description="Abertura, fechamento e grade da agenda"
        />
        <div className="p-4 text-sm text-muted-foreground md:p-6">
          Carregando horários…
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Horários de funcionamento"
        description="Abertura, fechamento e grade da agenda"
      />

      <div className="flex flex-col gap-5 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Dias da semana</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Dia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Abre</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekdays.map((weekday) => {
                const hour = hours.find((h) => h.weekday === weekday)
                if (!hour) return null
                return (
                  <TableRow key={weekday}>
                    <TableCell className="font-medium">{weekday}</TableCell>
                    <TableCell>
                      <Select
                        value={hour.closed ? 'fechado' : 'aberto'}
                        onValueChange={(value) => {
                          void (async () => {
                            try {
                              await updateStudioHour({
                                weekday: weekday as Weekday,
                                closed: value === 'fechado',
                              })
                              await reloadHours()
                              notify(
                                value === 'fechado'
                                  ? 'Dia fechado'
                                  : 'Dia aberto',
                              )
                            } catch (err) {
                              toast.error(
                                errorMessage(err, 'Não foi possível salvar'),
                              )
                            }
                          })()
                        }}
                      >
                        <SelectTrigger className="h-8 w-[7.5rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="aberto">Aberto</SelectItem>
                            <SelectItem value="fechado">Fechado</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {hour.closed ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <InlineCell
                          value={hour.open}
                          className="font-mono tabular-nums"
                          onSave={async (open) => {
                            if (!TIME_RE.test(open.trim())) {
                              toast.error('Horário inválido (use HH:MM)')
                              return
                            }
                            try {
                              await updateStudioHour({
                                weekday: weekday as Weekday,
                                open: open.trim(),
                              })
                              await reloadHours()
                              notify('Abertura')
                            } catch (err) {
                              toast.error(
                                errorMessage(err, 'Não foi possível salvar'),
                              )
                            }
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {hour.closed ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <InlineCell
                          value={hour.close}
                          className="font-mono tabular-nums"
                          onSave={async (close) => {
                            if (!TIME_RE.test(close.trim())) {
                              toast.error('Horário inválido (use HH:MM)')
                              return
                            }
                            try {
                              await updateStudioHour({
                                weekday: weekday as Weekday,
                                close: close.trim(),
                              })
                              await reloadHours()
                              notify('Fechamento')
                            } catch (err) {
                              toast.error(
                                errorMessage(err, 'Não foi possível salvar'),
                              )
                            }
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-4">
            <div>
              <CardTitle className="text-base">Grade da agenda</CardTitle>
            </div>
            <div className="w-36">
              <InlineField
                label="Capacidade / horário"
                type="number"
                value={String(capacity)}
                displayValue={`${capacity} pessoas`}
                onSave={async (raw) => {
                  const next = Math.min(
                    12,
                    Math.max(1, Math.round(Number(raw) || 1)),
                  )
                  try {
                    await Promise.all(
                      timeSlots.map((slot) =>
                        updateTimeSlot(slot.id, { capacity: next }),
                      ),
                    )
                    await reloadTimeSlots()
                    notify('Capacidade')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
            </div>
          </CardHeader>
          <div className="flex flex-col gap-4 p-4">
            <form
              className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault()
                void (async () => {
                  const time = normalizeTimeInput(newSlotTime)
                  if (!time) {
                    toast.error('Informe o horário no formato HH:MM')
                    return
                  }
                  if (timeSlots.some((s) => s.time === time)) {
                    toast.error('Este horário já existe na grade')
                    return
                  }
                  const period = periodForTime(time)
                  setAddingSlot(true)
                  try {
                    const created = await createTimeSlot({
                      time,
                      period,
                      capacity,
                    })
                    await reloadTimeSlots()
                    setNewSlotTime('')
                    toast.success('Horário adicionado', {
                      description: `${created.time} · ${
                        created.period === 'manha' ? 'Manhã' : 'Tarde'
                      }`,
                    })
                  } catch (err) {
                    toast.error(
                      errorMessage(err, 'Não foi possível adicionar'),
                    )
                  } finally {
                    setAddingSlot(false)
                  }
                })()
              }}
            >
              <Field className="min-w-[8rem] flex-1">
                <FieldLabel htmlFor="new-slot-time">Novo horário</FieldLabel>
                <Input
                  id="new-slot-time"
                  type="time"
                  step={300}
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
              </Field>
              <Button type="submit" disabled={addingSlot || !newSlotTime}>
                <Plus data-icon="inline-start" />
                {addingSlot ? 'Adicionando…' : 'Adicionar'}
              </Button>
            </form>

            <SlotGroup
              title="Manhã"
              slots={morning}
              onRename={async (slot, next) => {
                const time = normalizeTimeInput(next)
                if (!time) {
                  toast.error('Use o formato HH:MM')
                  return
                }
                if (time === slot.time) return
                try {
                  await updateTimeSlot(slot.id, {
                    time,
                    period: periodForTime(time),
                  })
                  await reloadTimeSlots()
                  notify('Horário')
                } catch (err) {
                  toast.error(errorMessage(err, 'Não foi possível renomear'))
                }
              }}
              onRemove={async (slot) => {
                try {
                  await deleteTimeSlot(slot.id)
                  await reloadTimeSlots()
                  toast.success('Horário removido', {
                    description: slot.time,
                  })
                } catch (err) {
                  toast.error(errorMessage(err, 'Não foi possível remover'))
                }
              }}
            />

            <SlotGroup
              title="Tarde"
              slots={afternoon}
              onRename={async (slot, next) => {
                const time = normalizeTimeInput(next)
                if (!time) {
                  toast.error('Use o formato HH:MM')
                  return
                }
                if (time === slot.time) return
                try {
                  await updateTimeSlot(slot.id, {
                    time,
                    period: periodForTime(time),
                  })
                  await reloadTimeSlots()
                  notify('Horário')
                } catch (err) {
                  toast.error(errorMessage(err, 'Não foi possível renomear'))
                }
              }}
              onRemove={async (slot) => {
                try {
                  await deleteTimeSlot(slot.id)
                  await reloadTimeSlots()
                  toast.success('Horário removido', {
                    description: slot.time,
                  })
                } catch (err) {
                  toast.error(errorMessage(err, 'Não foi possível remover'))
                }
              }}
            />
          </div>
        </Card>
      </div>
    </>
  )
}

function SlotGroup({
  title,
  slots,
  onRename,
  onRemove,
}: {
  title: string
  slots: TimeSlotDto[]
  onRename: (slot: TimeSlotDto, next: string) => void
  onRemove: (slot: TimeSlotDto) => void
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
        {slots.length > 0 ? (
          <span className="ml-1 font-normal normal-case">
            · {slots.length} horário{slots.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </p>
      {slots.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum horário neste período.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-1 rounded-lg border bg-background px-1.5 py-1"
            >
              <InlineCell
                value={slot.time}
                className="w-[4.5rem] font-mono text-sm tabular-nums"
                onSave={(next) => onRename(slot, next)}
              />
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remover ${slot.time}`}
                onClick={() => onRemove(slot)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
