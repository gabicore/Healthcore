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
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createClinicalAttendance,
  updateClinicalAttendance,
} from '@/lib/clinical-attendances-api'
import {
  serviceCategoryLabel,
  type ClinicalAttendance,
  type StudioService,
} from '@/lib/clinic-types'
import {
  afternoonSlots,
  availableSlotsForWeekday,
  getWeekdayFromDate,
  morningSlots,
  parseIsoDate,
  replaceScheduleSlots,
  replaceStudioHours,
  toIsoDate,
  type Professional,
  type Student,
} from '@/lib/data'
import { fetchServices } from '@/lib/services-api'
import {
  fetchProfessionals,
  fetchStudioHours,
  fetchTimeSlots,
} from '@/lib/settings-api'
import { fetchStudents } from '@/lib/students-api'

type Props = {
  defaultDate?: string
  defaultTime?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  editing?: ClinicalAttendance | null
  onSaved: (attendance: ClinicalAttendance) => void
}

export function NewAppointmentDialog({
  defaultDate,
  defaultTime,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  editing = null,
  onSaved,
}: Props) {
  const todayIso = useMemo(() => toIsoDate(new Date()), [])
  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const isEditing = Boolean(editing)

  const [students, setStudents] = useState<Student[]>([])
  const [services, setServices] = useState<StudioService[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [hoursTick, setHoursTick] = useState(0)
  const [saving, setSaving] = useState(false)

  const [studentId, setStudentId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState(defaultDate ?? todayIso)
  const [time, setTime] = useState(defaultTime ?? '08:00')
  const [notes, setNotes] = useState('')

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next)
    else setUncontrolledOpen(next)
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void Promise.all([
      fetchStudents({ active: true }),
      fetchServices({ active: true }),
      fetchProfessionals(),
      fetchStudioHours(),
      fetchTimeSlots(),
    ])
      .then(([studentList, serviceList, professionalList, hours, timeSlots]) => {
        if (cancelled) return
        replaceStudioHours(hours)
        replaceScheduleSlots(timeSlots)
        setHoursTick((t) => t + 1)
        setStudents(studentList)
        setServices(serviceList)
        setProfessionals(professionalList)
        if (editing) {
          setStudentId(editing.studentId)
          setServiceId(editing.serviceId)
          setProfessionalId(editing.professionalId)
          setDate(editing.date)
          setTime(editing.time)
          setNotes(editing.notes ?? '')
        } else {
          setStudentId('')
          setServiceId(serviceList[0]?.id ?? '')
          setProfessionalId(
            serviceList[0]?.professionalId ||
              professionalList[0]?.id ||
              '',
          )
          setDate(defaultDate ?? todayIso)
          setTime(defaultTime ?? '08:00')
          setNotes('')
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Não foi possível carregar dados da clínica')
      })
    return () => {
      cancelled = true
    }
  }, [open, editing, defaultDate, defaultTime, todayIso])

  const weekday = useMemo(() => {
    if (!date) return null
    return getWeekdayFromDate(parseIsoDate(date))
  }, [date])

  const slots = useMemo(() => {
    void hoursTick
    if (!weekday) return [...morningSlots, ...afternoonSlots]
    return availableSlotsForWeekday(weekday)
  }, [weekday, hoursTick])

  useEffect(() => {
    if (!open || slots.length === 0) return
    if (!slots.includes(time)) setTime(slots[0])
  }, [open, slots, time])

  const selectedStudent = students.find((s) => s.id === studentId)
  const selectedService = services.find((s) => s.id === serviceId)
  const selectedProfessional = professionals.find(
    (p) => p.id === professionalId,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!studentId) {
      toast.error('Selecione a pessoa')
      return
    }
    if (!serviceId) {
      toast.error('Selecione o serviço')
      return
    }
    if (!professionalId) {
      toast.error('Selecione a profissional')
      return
    }
    if (!weekday) {
      toast.error('O estúdio não funciona aos domingos')
      return
    }
    if (!slots.includes(time)) {
      toast.error('Horário fora do funcionamento do estúdio')
      return
    }

    setSaving(true)
    try {
      const saved =
        isEditing && editing
          ? await updateClinicalAttendance(editing.id, {
              studentId,
              serviceId,
              professionalId,
              date,
              time,
              notes: notes.trim() || null,
            })
          : await createClinicalAttendance({
              studentId,
              serviceId,
              professionalId,
              date,
              time,
              status: 'agendada',
              notes: notes.trim() || undefined,
            })
      onSaved(saved)
      setOpen(false)
      toast.success(isEditing ? 'Atendimento atualizado' : 'Atendimento marcado')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o atendimento',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <DialogTrigger
          render={
            <Button size="sm">
              <CalendarPlus data-icon="inline-start" />
              Marcar atendimento
            </Button>
          }
        />
      ) : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar atendimento' : 'Marcar atendimento'}
          </DialogTitle>
          <DialogDescription>
            Usa o cadastro único de Pessoas. Não conflita com a Agenda
            Pilates da mesma profissional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <FieldGroup>
            <Field>
              <FieldLabel>Pessoa</FieldLabel>
              <Select
                value={studentId || null}
                onValueChange={(v) => setStudentId(v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione">
                    {selectedStudent?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {students.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Cadastre a pessoa em Pessoas.
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel>Serviço</FieldLabel>
              <Select
                value={serviceId || null}
                onValueChange={(v) => {
                  const next = v ?? ''
                  setServiceId(next)
                  const svc = services.find((s) => s.id === next)
                  if (svc?.professionalId) {
                    setProfessionalId(svc.professionalId)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione">
                    {selectedService
                      ? `${selectedService.name} · ${serviceCategoryLabel[selectedService.category]}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {serviceCategoryLabel[s.category]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione">
                    {selectedProfessional?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Data</FieldLabel>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Horário</FieldLabel>
                <Select
                  value={time || null}
                  onValueChange={(v) => setTime(v ?? slots[0] ?? '08:00')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{time}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {slots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel>Observações</FieldLabel>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6" showCloseButton={false}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                students.length === 0 ||
                services.length === 0 ||
                professionals.length === 0
              }
            >
              {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Marcar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
