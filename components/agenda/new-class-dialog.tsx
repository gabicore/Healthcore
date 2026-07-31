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
  afternoonSlots,
  availableSlotsForWeekday,
  countActiveInSlot,
  getWeekdayFromDate,
  morningSlots,
  parseIsoDate,
  replaceScheduleSlots,
  replaceStudioHours,
  toIsoDate,
  type AttendanceStatus,
  type ClassSession,
  type ClassSessionType,
  type Professional,
  type Student,
} from '@/lib/data'
import { fetchStudents } from '@/lib/students-api'
import {
  fetchProfessionals,
  fetchStudioHours,
  fetchTimeSlots,
} from '@/lib/settings-api'

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
  /** Quando informado, o diálogo edita a aula existente. */
  editingSession?: ClassSession | null
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
  editingSession = null,
  onCreate,
}: NewClassDialogProps) {
  const todayIso = useMemo(() => toIsoDate(new Date()), [])
  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const isEditing = Boolean(editingSession)

  const [students, setStudents] = useState<Student[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [studentId, setStudentId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [date, setDate] = useState(defaultDate ?? todayIso)
  const [time, setTime] = useState(defaultTime ?? '08:00')
  const [type, setType] = useState<ClassSessionType>(
    defaultType === 'fixa' ? 'reposicao' : defaultType,
  )
  const [professionalId, setProfessionalId] = useState('')
  const [notes, setNotes] = useState('')

  const [hoursTick, setHoursTick] = useState(0)
  const isExperimental = type === 'experimental'

  const activeStudents = useMemo(
    () =>
      students.filter(
        (s) => s.active && s.activeContract != null,
      ),
    [students],
  )

  const weekday = useMemo(() => {
    if (!date) return null
    return getWeekdayFromDate(parseIsoDate(date))
  }, [date])

  const slots = useMemo(() => {
    void hoursTick
    if (!weekday) return [...morningSlots, ...afternoonSlots]
    return availableSlotsForWeekday(weekday)
  }, [weekday, hoursTick])

  const slotCapacity = useMemo(() => {
    void hoursTick
    return SLOT_CAPACITY
  }, [hoursTick])

  const occupiedRaw = weekday ? countActiveInSlot(sessions, date, time) : 0
  const occupied =
    editingSession &&
    editingSession.date === date &&
    editingSession.time === time &&
    editingSession.status !== 'cancelada'
      ? Math.max(0, occupiedRaw - 1)
      : occupiedRaw
  const remaining = Math.max(0, slotCapacity - occupied)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void Promise.all([
      fetchStudents({ active: true }),
      fetchProfessionals(),
      fetchStudioHours(),
      fetchTimeSlots(),
    ])
      .then(([studentList, professionalList, hours, timeSlots]) => {
        if (cancelled) return
        replaceStudioHours(hours)
        replaceScheduleSlots(timeSlots)
        setHoursTick((t) => t + 1)
        setStudents(studentList)
        setProfessionals(professionalList)
        setProfessionalId((current) => {
          if (editingSession?.professionalId) return editingSession.professionalId
          return current || professionalList[0]?.id || ''
        })
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Não foi possível carregar alunos/profissionais')
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, editingSession?.professionalId])

  useEffect(() => {
    if (!open || !weekday) return
    if (slots.length > 0 && !slots.includes(time)) {
      setTime(slots[0])
    }
  }, [open, weekday, slots, time])

  // Só reinicia o formulário ao abrir o diálogo — não ao mudar a data.
  useEffect(() => {
    if (!open) return
    if (editingSession) {
      const linkedStudent =
        editingSession.studentId && !editingSession.studentId.startsWith('guest-')
          ? editingSession.studentId
          : ''
      setDate(editingSession.date)
      setTime(editingSession.time)
      setType(
        editingSession.type === 'fixa' ? 'reposicao' : editingSession.type,
      )
      setStudentId(linkedStudent)
      setGuestName(editingSession.guestName ?? '')
      setProfessionalId(editingSession.professionalId ?? '')
      setNotes(editingSession.notes ?? '')
      return
    }
    const nextDate = defaultDate ?? todayIso
    const nextWeekday = getWeekdayFromDate(parseIsoDate(nextDate))
    const nextSlots = nextWeekday
      ? availableSlotsForWeekday(nextWeekday)
      : [...morningSlots, ...afternoonSlots]
    setDate(nextDate)
    setTime(
      defaultTime && nextSlots.includes(defaultTime)
        ? defaultTime
        : (nextSlots[0] ?? '08:00'),
    )
    setType(defaultType === 'fixa' ? 'reposicao' : defaultType)
    setStudentId('')
    setGuestName('')
    setNotes('')
  }, [open, editingSession, defaultDate, defaultTime, defaultType, todayIso])

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
    setProfessionalId(professionals[0]?.id ?? '')
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

    if (slots.length === 0) {
      toast.error('Estúdio fechado neste dia')
      return
    }

    if (!slots.includes(time)) {
      toast.error('Horário indisponível neste dia', {
        description: 'Fora do funcionamento do estúdio ou da grade.',
      })
      return
    }

    if (remaining <= 0) {
      toast.error('Horário lotado', {
        description: `Máximo de ${slotCapacity} alunos por horário.`,
      })
      return
    }

    const selectedStudent = students.find((s) => s.id === studentId)
    const resolvedStudentId =
      studentId ||
      editingSession?.studentId ||
      `guest-${Date.now()}`
    const resolvedGuestName = isExperimental
      ? guestName.trim() || selectedStudent?.name || undefined
      : undefined

    const alreadyBooked = sessions.some(
      (s) =>
        s.id !== editingSession?.id &&
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
    const status: AttendanceStatus = isEditing
      ? editingSession!.status === 'reposicao' && sessionType !== 'reposicao'
        ? 'agendada'
        : editingSession!.status
      : 'agendada'

    onCreate({
      id:
        editingSession?.id ??
        `manual-${resolvedStudentId}-${date}-${time}-${Date.now()}`,
      studentId: resolvedStudentId,
      guestName: resolvedGuestName,
      date,
      weekday,
      time,
      status,
      type: sessionType,
      professionalId: professionalId || undefined,
      notes: notes.trim() || undefined,
    })

    handleOpenChange(false)
    toast.success(
      isEditing
        ? 'Aula atualizada'
        : sessionType === 'reposicao'
          ? 'Reposição agendada'
          : sessionType === 'experimental'
            ? 'Aula experimental marcada'
            : 'Aula avulsa marcada',
    )
  }

  const typeLabel: Record<'reposicao' | 'avulsa' | 'experimental', string> = {
    reposicao: 'Reposição',
    avulsa: 'Avulsa',
    experimental: 'Experimental',
  }
  const selectedType = type === 'fixa' ? 'reposicao' : type
  const morningOptions = slots.filter((t) => morningSlots.includes(t))
  const afternoonOptions = slots.filter((t) => afternoonSlots.includes(t))
  const dialogTitle = isEditing
    ? editingSession?.type === 'experimental'
      ? 'Editar experimental'
      : 'Editar aula'
    : title
  const dialogDescription = isEditing
    ? 'Altere data, horário, cliente ou profissional desta aula.'
    : description

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Select
                value={selectedType}
                onValueChange={(v) =>
                  setType((v as ClassSessionType) ?? 'reposicao')
                }
                disabled={isEditing && editingSession?.type === 'experimental'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {typeLabel[selectedType as keyof typeof typeLabel] ??
                      selectedType}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="reposicao">Reposição</SelectItem>
                    <SelectItem value="avulsa">Avulsa</SelectItem>
                    <SelectItem value="experimental">Experimental</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            {isExperimental ? (
              <Field>
                <FieldLabel htmlFor="guest-name">Nome do cliente</FieldLabel>
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
                {isExperimental ? 'Aluno cadastrado (opcional)' : 'Aluno'}
              </FieldLabel>
              <Select
                value={studentId || null}
                onValueChange={(v) => setStudentId(v ?? '')}
                items={Object.fromEntries(
                  activeStudents.map((s) => [s.id, s.name]),
                )}
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
                    <SelectValue>{time}</SelectValue>
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
                  value={professionalId || null}
                  onValueChange={(v) =>
                    setProfessionalId(v ?? professionals[0]?.id ?? '')
                  }
                  items={Object.fromEntries(
                    professionals.map((p) => [p.id, p.name]),
                  )}
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
                : `${occupied}/${slotCapacity} ocupadas · ${remaining} vaga(s) livre(s)`}
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
              {isEditing
                ? 'Salvar alterações'
                : isExperimental
                  ? 'Salvar experimental'
                  : 'Salvar aula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
