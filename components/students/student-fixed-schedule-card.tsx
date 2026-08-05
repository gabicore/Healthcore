'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
  formatSchedulePeriodLabel,
  formatShortDate,
  groupScheduleIntoPeriods,
  morningSlots,
  periodWeekdays,
  sortScheduleSlots,
  toIsoDate,
  weekdays,
  type SchedulePeriod,
  type ScheduleSlot,
  type Weekday,
} from '@/lib/data'
import { cn } from '@/lib/utils'

type StudentFixedScheduleCardProps = {
  schedule: ScheduleSlot[]
  weeklyLimit: number | null
  contractStart?: string
  contractEnd?: string
  onRegister: (
    slots: ScheduleSlot[],
    effectiveFrom: string,
  ) => Promise<boolean>
  onDeletePeriod: (
    effectiveFrom: string,
    effectiveTo: string | null,
  ) => Promise<boolean>
}

export function StudentFixedScheduleCard({
  schedule,
  weeklyLimit,
  contractStart,
  contractEnd,
  onRegister,
  onDeletePeriod,
}: StudentFixedScheduleCardProps) {
  const [open, setOpen] = useState(false)
  const [periodToDelete, setPeriodToDelete] = useState<SchedulePeriod | null>(
    null,
  )
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    toIsoDate(new Date()),
  )
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([])
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    const isFirstGrade = schedule.length === 0
    setEffectiveFrom(
      isFirstGrade && contractStart
        ? contractStart.slice(0, 10)
        : toIsoDate(new Date()),
    )
    setSelectedDays([])
    setTime('')
  }, [open, schedule.length, contractStart])

  const periods = useMemo(
    () => groupScheduleIntoPeriods(schedule),
    [schedule],
  )

  const slotOptions = useMemo(() => {
    if (selectedDays.length === 0) {
      return [
        ...new Set([
          ...morningSlots,
          ...afternoonSlots,
          ...weekdays.flatMap((day) => availableSlotsForWeekday(day)),
        ]),
      ].sort()
    }
    return selectedDays
      .map((day) => availableSlotsForWeekday(day))
      .reduce<string[]>((common, times) => {
        if (common.length === 0) return times
        return common.filter((t) => times.includes(t))
      }, [])
  }, [selectedDays])

  const morningOptions = slotOptions.filter((t) => morningSlots.includes(t))
  const afternoonOptions = slotOptions.filter((t) =>
    afternoonSlots.includes(t),
  )

  const draft = useMemo(() => {
    if (!time || selectedDays.length === 0) return [] as ScheduleSlot[]
    return sortScheduleSlots(
      selectedDays
        .filter((day) => availableSlotsForWeekday(day).includes(time))
        .map((day) => ({ weekday: day, time })),
    )
  }, [selectedDays, time])

  function openDialog() {
    setOpen(true)
  }

  function handleFormOpenChange(next: boolean) {
    if (saving) return
    setOpen(next)
  }

  function toggleDay(day: Weekday) {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day)
      }
      if (weeklyLimit != null && prev.length >= weeklyLimit) {
        toast.error('Limite do plano atingido', {
          description: `O plano permite no máximo ${weeklyLimit} aula(s) por semana.`,
        })
        return prev
      }
      const dayOptions = availableSlotsForWeekday(day)
      if (dayOptions.length === 0) {
        toast.error('Estúdio fechado neste dia')
        return prev
      }
      if (time && !dayOptions.includes(time)) {
        toast.error(`Estúdio fechado em ${day} às ${time}`)
        return prev
      }
      return [...prev, day]
    })
  }

  function copyCurrentGrade() {
    const current = currentScheduleSlots(schedule)
    if (current.length === 0) {
      toast.error('Não há grade atual para copiar')
      return
    }
    setSelectedDays(current.map((s) => s.weekday))
    const times = [...new Set(current.map((s) => s.time))]
    setTime(times[0] ?? '')
    if (times.length > 1) {
      toast.message('Grade copiada', {
        description:
          'A grade atual tem horários diferentes; use o primeiro horário e ajuste se precisar.',
      })
    }
  }

  async function handleRegister() {
    if (!effectiveFrom) {
      toast.error('Informe a data de início da nova grade')
      return
    }
    if (weeklyLimit == null) {
      toast.error('Plano do contrato não encontrado', {
        description:
          'Não é possível salvar a grade sem a frequência do contrato ativo.',
      })
      return
    }
    if (!time) {
      toast.error('Selecione um horário')
      return
    }
    if (selectedDays.length === 0) {
      toast.error('Selecione os dias da semana', {
        description: `O contrato exige ${weeklyLimit} aula(s) por semana.`,
      })
      return
    }
    if (draft.length === 0) {
      toast.error('Nenhum horário válido para os dias selecionados')
      return
    }
    if (draft.length !== weeklyLimit) {
      toast.error('Grade incompleta', {
        description: `O contrato exige ${weeklyLimit} aula(s) por semana. Selecione ${weeklyLimit} dia(s).`,
      })
      return
    }
    setSaving(true)
    try {
      const ok = await onRegister(draft, effectiveFrom)
      if (ok) {
        toast.success('Nova grade registrada', {
          description: `Válida a partir de ${formatShortDate(effectiveFrom)}`,
        })
        setOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePeriod() {
    if (!periodToDelete) return
    setDeleting(true)
    try {
      const ok = await onDeletePeriod(
        periodToDelete.effectiveFrom,
        periodToDelete.effectiveTo,
      )
      if (ok) {
        toast.success('Período removido do histórico')
        setPeriodToDelete(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Histórico de horários</CardTitle>
          <Button type="button" size="sm" onClick={openDialog}>
            <Plus data-icon="inline-start" />
            Incluir nova grade
          </Button>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma grade registrada ainda
              {weeklyLimit != null
                ? `. Inclua ${weeklyLimit} horário(s) por semana.`
                : '.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Dias da semana</TableHead>
                    <TableHead>Horários</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[56px]">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => {
                    const days = periodWeekdays(period.slots)
                    return (
                      <TableRow key={period.key}>
                        <TableCell className="whitespace-nowrap text-sm font-medium">
                          {formatSchedulePeriodLabel(period)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-wrap gap-1.5 whitespace-normal">
                            {days.length === 0
                              ? '—'
                              : days.map((day) => (
                                  <Badge key={day} variant="outline">
                                    {day}
                                  </Badge>
                                ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-wrap gap-1.5 whitespace-normal">
                            {period.slots.map((slot) => (
                              <Badge
                                key={`${slot.weekday}-${slot.time}`}
                                variant="secondary"
                              >
                                {slot.weekday} · {slot.time}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              period.isCurrent ? 'secondary' : 'outline'
                            }
                          >
                            {period.isCurrent ? 'Atual' : 'Encerrado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setPeriodToDelete(period)}
                            aria-label={`Excluir período ${formatSchedulePeriodLabel(period)}`}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={periodToDelete != null}
        onOpenChange={(next) => {
          if (deleting) return
          if (!next) setPeriodToDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Excluir período</DialogTitle>
            <DialogDescription>
              Remover{' '}
              <span className="font-medium text-foreground">
                {periodToDelete
                  ? formatSchedulePeriodLabel(periodToDelete)
                  : ''}
              </span>{' '}
              do histórico de horários? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setPeriodToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeletePeriod()}
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={open}
        onOpenChange={handleFormOpenChange}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle>Incluir nova grade</DialogTitle>
            <DialogDescription>
              Preencha todos os dias exigidos pelo contrato
              {weeklyLimit != null ? ` (${weeklyLimit}x por semana)` : ''}. A
              grade só pode ser salva completa.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-1 py-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">A partir de</span>
              <Input
                type="date"
                value={effectiveFrom}
                min={contractStart}
                max={contractEnd}
                onChange={(e) =>
                  setEffectiveFrom(e.target.value || toIsoDate(new Date()))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Dias da semana
                  {weeklyLimit != null
                    ? ` (${selectedDays.length}/${weeklyLimit})`
                    : ''}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={copyCurrentGrade}
                >
                  Copiar grade atual
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day) => {
                  const active = selectedDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-muted',
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Horário</span>
              <Select
                value={time || undefined}
                onValueChange={(v) => setTime(v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
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
                  {slotOptions.length === 0 ? (
                    <SelectGroup>
                      <SelectItem value="__none" disabled>
                        Sem horário comum nos dias
                      </SelectItem>
                    </SelectGroup>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            {draft.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Grade:{' '}
                {draft.map((s) => `${s.weekday} ${s.time}`).join(' · ')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione os dias e o horário para montar a grade.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleRegister()}
              disabled={
                saving ||
                weeklyLimit == null ||
                draft.length === 0 ||
                draft.length !== weeklyLimit
              }
            >
              {saving ? 'Registrando…' : 'Registrar grade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
