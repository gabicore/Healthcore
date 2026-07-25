'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
  SLOT_CAPACITY,
  students,
  professionals,
  morningSlots,
  afternoonSlots,
  availableSlotsForWeekday,
  countActiveInSlot,
  getWeekdayFromDate,
  parseIsoDate,
  toIsoDate,
  type AttendanceStatus,
  type ClassSession,
  type ClassSessionType,
} from '@/lib/data'

type NewClassDialogProps = {
  defaultDate?: string
  defaultTime?: string
  defaultType?: ClassSessionType
  triggerLabel?: string
  title?: string
  description?: string
  hideTrigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  sessions?: ClassSession[]
  onCreate: (session: ClassSession) => void
}

export function NewClassDialog({
  defaultDate,
  defaultTime,
  defaultType = 'reposicao',
  triggerLabel = 'Marcar reposição',
  title = 'Marcar aula',
  description = 'A grade fixa vem do plano de cada aluno. Aqui você marca reposição, avulsa ou aula experimental.',
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange,
  sessions = [],
  onCreate,
}: NewClassDialogProps) {
  const todayIso = toIsoDate(new Date())
  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const [studentId, setStudentId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [date, setDate] = useState(defaultDate ?? todayIso)
  const [time, setTime] = useState(defaultTime ?? '08:00')
  const [type, setType] = useState<ClassSessionType>(
    defaultType === 'fixa' ? 'reposicao' : defaultType,
  )
  const [professionalId, setProfessionalId] = useState(professionals[0].id)
  const [notes, setNotes] = useState('')

  const isExperimental = type === 'experimental'

  const activeStudents = useMemo(
    () => students.filter((s) => s.active),
    [],
  )

  const weekday = useMemo(() => {
    if (!date) return null
    return getWeekdayFromDate(parseIsoDate(date))
  }, [date])

  const slots = useMemo(() => {
    if (!weekday) return [...morningSlots, ...afternoonSlots]
    return availableSlotsForWeekday(weekday)
  }, [weekday])

  const occupied = weekday
    ? countActiveInSlot(sessions, date, time)
    : 0
  const remaining = Math.max(0, SLOT_CAPACITY - occupied)

  useEffect(() => {
    if (!open) return
    setDate(defaultDate ?? todayIso)
    setTime(
      defaultTime && slots.includes(defaultTime)
        ? defaultTime
        : (slots[0] ?? '08:00'),
    )
    setType(defaultType === 'fixa' ? 'reposicao' : defaultType)
  }, [open, defaultDate, defaultTime, defaultType, todayIso, slots])

  useEffect(() => {
    if (!slots.includes(time) && slots.length > 0) {
      setTime(slots[0])
    }
  }, [slots, time])

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  function resetForm() {
    setStudentId('')
    setGuestName('')
    setDate(defaultDate ?? todayIso)
    setTime(defaultTime ?? '08:00')
    setType(defaultType === 'fixa' ? 'reposicao' : defaultType)
    setProfessionalId(professionals[0].id)
    setNotes('')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) resetForm()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!date || !time) {
      toast.error('Preencha data e horário')
      return
    }

    if (isExperimental) {
      if (!guestName.trim() && !studentId) {
        toast.error('Informe o nome do cliente ou selecione um aluno')
        return
      }
    } else if (!studentId) {
      toast.error('Selecione o aluno')
      return
    }

    if (!weekday) {
      toast.error('O estúdio não funciona aos domingos')
      return
    }

    if (!slots.includes(time)) {
      toast.error('Horário indisponível neste dia')
      return
    }

    if (remaining <= 0) {
      toast.error('Horário lotado', {
        description: `Máximo de ${SLOT_CAPACITY} alunos por horário.`,
      })
      return
    }

    const resolvedStudentId =
      studentId || `guest-${Date.now()}`
    const resolvedGuestName = isExperimental
      ? guestName.trim() || undefined
      : undefined

    const alreadyBooked = sessions.some(
      (s) =>
        s.date === date &&
        s.time === time &&
        s.status !== 'cancelada' &&
        (studentId
          ? s.studentId === studentId
          : resolvedGuestName
            ? s.guestName?.toLowerCase() === resolvedGuestName.toLowerCase()
            : false),
    )
    if (alreadyBooked) {
      toast.error(
        isExperimental
          ? 'Cliente já está neste horário'
          : 'Aluno já está neste horário',
      )
      return
    }

    const sessionType: ClassSessionType =
      type === 'avulsa'
        ? 'avulsa'
        : type === 'experimental'
          ? 'experimental'
          : 'reposicao'
    const status: AttendanceStatus =
      sessionType === 'reposicao' ? 'reposicao' : 'agendada'

    onCreate({
      id: `manual-${resolvedStudentId}-${date}-${time}-${Date.now()}`,
      studentId: resolvedStudentId,
      guestName: resolvedGuestName,
      date,
      weekday,
      time,
      status,
      type: sessionType,
      professionalId,
      notes: notes.trim() || undefined,
    })

    handleOpenChange(false)
    const successLabel =
      sessionType === 'reposicao'
        ? 'Reposição agendada'
        : sessionType === 'experimental'
          ? 'Aula experimental marcada'
          : 'Aula avulsa marcada'
    toast.success(successLabel, {
      description:
        'A alteração será salva quando o banco de dados for conectado.',
    })
  }

  const morningOptions = slots.filter((t) => morningSlots.includes(t))
  const afternoonOptions = slots.filter((t) => afternoonSlots.includes(t))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger
          render={
            <Button size="sm">
              <CalendarPlus data-icon="inline-start" />
              {triggerLabel}
            </Button>
          }
        />
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Select
                value={type === 'fixa' ? 'reposicao' : type}
                onValueChange={(v) =>
                  setType((v as ClassSessionType) ?? 'reposicao')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="reposicao">Reposição</SelectItem>
                    <SelectItem value="avulsa">Avulsa</SelectItem>
                    <SelectItem value="experimental">
                      Experimental
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            {isExperimental ? (
              <Field>
                <FieldLabel htmlFor="guest-name">
                  Nome do cliente
                </FieldLabel>
                <Input
                  id="guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ex.: Maria Silva"
                  required={!studentId}
                />
              </Field>
            ) : null}

            <Field>
              <FieldLabel>
                {isExperimental
                  ? 'Aluno cadastrado (opcional)'
                  : 'Aluno'}
              </FieldLabel>
              <Select
                value={studentId || null}
                onValueChange={(v) => setStudentId(v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isExperimental
                        ? 'Opcional — se já tiver cadastro'
                        : 'Selecione o aluno'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {activeStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="class-date">Data</FieldLabel>
                <Input
                  id="class-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Dia da semana</FieldLabel>
                <Input
                  readOnly
                  value={weekday ?? 'Domingo'}
                  className="bg-muted"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectValue placeholder="Selecione" />
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
            </div>

            <p
              className={`-mt-1 text-xs ${
                remaining === 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {remaining === 0
                ? 'Horário lotado — escolha outro.'
                : `${occupied}/${SLOT_CAPACITY} ocupadas · ${remaining} vaga(s) livre(s)`}
            </p>

            <Field>
              <FieldLabel htmlFor="class-notes">Observação</FieldLabel>
              <Input
                id="class-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isExperimental
                    ? 'Opcional — ex.: indicação, interesse no plano'
                    : 'Opcional — ex.: horário de reposição'
                }
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
            <Button type="submit" disabled={remaining === 0}>
              {isExperimental ? 'Salvar experimental' : 'Salvar aula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
