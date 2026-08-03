'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  formatCurrency,
  getPlan,
  planPeriodLabel,
  plans,
  studentChargedValue,
  availableSlotsForWeekday,
  currentScheduleSlots,
  replaceStudioHours,
  weekdays,
  type PaymentMethod,
  type ScheduleSlot,
  type Sex,
  type Student,
  type Weekday,
} from '@/lib/data'
import { fetchStudentContracts } from '@/lib/contracts-api'
import { fetchStudioHours } from '@/lib/settings-api'

const periodOrder = ['semestral', 'trimestral', 'mensal'] as const
const sexes: Sex[] = ['Feminino', 'Masculino', 'Outro']
const paymentMethods: PaymentMethod[] = [
  'PIX',
  'Cartão de crédito',
  'Boleto',
  'Dinheiro',
]

type EditableStudent = Pick<
  Student,
  | 'name'
  | 'birthDate'
  | 'sex'
  | 'cpf'
  | 'phone'
  | 'email'
  | 'cep'
  | 'address'
  | 'emergencyContact'
  | 'active'
  | 'objective'
  | 'pathologies'
  | 'injuries'
  | 'surgeries'
  | 'restrictions'
  | 'medications'
  | 'notes'
  | 'planId'
  | 'monthlyValue'
  | 'discountPercent'
  | 'dueDay'
  | 'paymentMethod'
  | 'schedule'
>

type EditStudentDialogProps = {
  student: Student
  onSave: (patch: EditableStudent) => void
}

function toEditable(student: Student): EditableStudent {
  return {
    name: student.name,
    birthDate: student.birthDate,
    sex: student.sex,
    cpf: student.cpf,
    phone: student.phone,
    email: student.email,
    cep: student.cep,
    address: student.address,
    emergencyContact: student.emergencyContact,
    active: student.active,
    objective: student.objective,
    pathologies: student.pathologies,
    injuries: student.injuries,
    surgeries: student.surgeries,
    restrictions: student.restrictions,
    medications: student.medications,
    notes: student.notes,
    planId: student.planId,
    monthlyValue: student.monthlyValue,
    discountPercent: student.discountPercent ?? 0,
    dueDay: student.dueDay,
    paymentMethod: student.paymentMethod,
    schedule: currentScheduleSlots(student.schedule).map((s) => ({
      weekday: s.weekday,
      time: s.time,
    })),
  }
}

export function EditStudentDialog({ student, onSave }: EditStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<EditableStudent>(() => toEditable(student))
  const [slotWeekday, setSlotWeekday] = useState<Weekday>('Segunda')
  const [slotTime, setSlotTime] = useState('08:00')
  const [hoursTick, setHoursTick] = useState(0)
  const [weeklyLimit, setWeeklyLimit] = useState(
    () => getPlan(student.planId)?.frequency ?? 1,
  )
  const [hasActiveContract, setHasActiveContract] = useState(false)
  const [activePlanLabel, setActivePlanLabel] = useState<string | null>(null)

  useEffect(() => {
    if (open) setForm(toEditable(student))
  }, [open, student])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void Promise.all([
      fetchStudioHours(),
      fetchStudentContracts(student.id),
    ])
      .then(([hours, contracts]) => {
        if (cancelled) return
        replaceStudioHours(hours)
        setHoursTick((t) => t + 1)
        const active = contracts.find((c) => c.status === 'ativo')
        setHasActiveContract(Boolean(active))
        setActivePlanLabel(active?.planLabel ?? null)
        const planId = active?.planId ?? student.planId
        setWeeklyLimit(getPlan(planId)?.frequency ?? 1)
        if (active) {
          setForm((prev) => ({
            ...prev,
            planId: active.planId,
            monthlyValue: active.monthlyValue,
            discountPercent: active.discountPercent,
            dueDay: active.dueDay,
            paymentMethod: active.paymentMethod,
          }))
        }
      })
      .catch(() => {
        /* usa horários/plano em memória */
      })
    return () => {
      cancelled = true
    }
  }, [open, student.id, student.planId])

  const scheduleSlotOptions = useMemo(() => {
    void hoursTick
    return availableSlotsForWeekday(slotWeekday)
  }, [slotWeekday, hoursTick])

  useEffect(() => {
    if (
      scheduleSlotOptions.length > 0 &&
      !scheduleSlotOptions.includes(slotTime)
    ) {
      setSlotTime(scheduleSlotOptions[0])
    }
  }, [scheduleSlotOptions, slotTime])

  const selectedPlan = useMemo(() => getPlan(form.planId), [form.planId])

  function update<K extends keyof EditableStudent>(
    key: K,
    value: EditableStudent[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePlanChange(planId: string) {
    const plan = getPlan(planId)
    setForm((prev) => ({
      ...prev,
      planId,
      monthlyValue: plan
        ? studentChargedValue(plan, prev.discountPercent)
        : prev.monthlyValue,
    }))
  }

  function handleDiscountChange(raw: number) {
    const discountPercent = Math.min(100, Math.max(0, raw))
    setForm((prev) => {
      const plan = getPlan(prev.planId)
      return {
        ...prev,
        discountPercent,
        monthlyValue: plan
          ? studentChargedValue(plan, discountPercent)
          : prev.monthlyValue,
      }
    })
  }

  function addScheduleSlot() {
    if (form.schedule.length >= weeklyLimit) {
      toast.error('Limite do plano atingido', {
        description: `O contrato/plano permite no máximo ${weeklyLimit} aula(s) fixa(s) por semana.`,
      })
      return
    }
    if (scheduleSlotOptions.length === 0) {
      toast.error('Estúdio fechado neste dia')
      return
    }
    if (!scheduleSlotOptions.includes(slotTime)) {
      toast.error('Horário fora do funcionamento do estúdio')
      return
    }
    const exists = form.schedule.some(
      (s) => s.weekday === slotWeekday && s.time === slotTime,
    )
    if (exists) {
      toast.error('Este horário já está na agenda do aluno')
      return
    }
    const next: ScheduleSlot = { weekday: slotWeekday, time: slotTime }
    setForm((prev) => ({
      ...prev,
      schedule: [...prev.schedule, next].sort((a, b) =>
        `${a.weekday}${a.time}`.localeCompare(`${b.weekday}${b.time}`),
      ),
    }))
  }

  function removeScheduleSlot(slot: ScheduleSlot) {
    setForm((prev) => ({
      ...prev,
      schedule: prev.schedule.filter(
        (s) => !(s.weekday === slot.weekday && s.time === slot.time),
      ),
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Informe o nome do aluno')
      return
    }
    // Com contrato ativo, plano/cobrança não saem deste formulário.
    const payload: EditableStudent = hasActiveContract
      ? {
          ...form,
          planId: student.planId,
          monthlyValue: student.monthlyValue,
          discountPercent: student.discountPercent ?? 0,
          dueDay: student.dueDay,
          paymentMethod: student.paymentMethod,
        }
      : form
    onSave({
      ...payload,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      cpf: form.cpf.trim(),
    })
    setOpen(false)
    toast.success('Aluno atualizado')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        }
      />
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>Editar aluno</DialogTitle>
          <DialogDescription>
            Atualize dados pessoais, clínico, plano e agenda fixa.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Tabs defaultValue="pessoal" className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="border-b px-4">
              <TabsList variant="line" className="w-full justify-start">
                <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
                <TabsTrigger value="clinico">Clínico</TabsTrigger>
                <TabsTrigger value="plano">Plano</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <TabsContent value="pessoal" className="mt-0">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="edit-name">Nome completo</FieldLabel>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-birth">Nascimento</FieldLabel>
                      <Input
                        id="edit-birth"
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => update('birthDate', e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Sexo</FieldLabel>
                      <Select
                        value={form.sex}
                        onValueChange={(v) => update('sex', (v as Sex) ?? form.sex)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {sexes.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-cpf">CPF</FieldLabel>
                      <Input
                        id="edit-cpf"
                        value={form.cpf}
                        onChange={(e) => update('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-phone">Telefone</FieldLabel>
                      <Input
                        id="edit-phone"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="edit-email">E-mail</FieldLabel>
                    <Input
                      id="edit-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-cep">CEP</FieldLabel>
                      <Input
                        id="edit-cep"
                        value={form.cep}
                        onChange={(e) => update('cep', e.target.value)}
                        placeholder="00000-000"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-address">Endereço</FieldLabel>
                      <Input
                        id="edit-address"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="edit-emergency">
                      Contato de emergência
                    </FieldLabel>
                    <Input
                      id="edit-emergency"
                      value={form.emergencyContact}
                      onChange={(e) =>
                        update('emergencyContact', e.target.value)
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Situação</FieldLabel>
                    <Select
                      value={form.active ? 'ativo' : 'inativo'}
                      onValueChange={(v) => update('active', v === 'ativo')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="clinico" className="mt-0">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="edit-objective">Objetivo</FieldLabel>
                    <Textarea
                      id="edit-objective"
                      value={form.objective}
                      onChange={(e) => update('objective', e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-pathologies">
                        Patologias
                      </FieldLabel>
                      <Textarea
                        id="edit-pathologies"
                        value={form.pathologies}
                        onChange={(e) => update('pathologies', e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-injuries">Lesões</FieldLabel>
                      <Textarea
                        id="edit-injuries"
                        value={form.injuries}
                        onChange={(e) => update('injuries', e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-surgeries">Cirurgias</FieldLabel>
                      <Textarea
                        id="edit-surgeries"
                        value={form.surgeries}
                        onChange={(e) => update('surgeries', e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-restrictions">
                        Restrições
                      </FieldLabel>
                      <Textarea
                        id="edit-restrictions"
                        value={form.restrictions}
                        onChange={(e) => update('restrictions', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="edit-medications">
                      Medicamentos
                    </FieldLabel>
                    <Textarea
                      id="edit-medications"
                      value={form.medications}
                      onChange={(e) => update('medications', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-notes">Observações</FieldLabel>
                    <Textarea
                      id="edit-notes"
                      value={form.notes}
                      onChange={(e) => update('notes', e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="plano" className="mt-0">
                <FieldGroup>
                  {hasActiveContract ? (
                    <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                      Plano e cobrança seguem o contrato ativo
                      {activePlanLabel ? ` (${activePlanLabel})` : ''}. Altere
                      pelo painel de contratos.
                    </p>
                  ) : null}
                  <Field>
                    <FieldLabel>Plano contratado</FieldLabel>
                    <Select
                      value={form.planId}
                      disabled={hasActiveContract}
                      onValueChange={(v) => {
                        if (v) handlePlanChange(v)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodOrder.map((period) => (
                          <SelectGroup key={period}>
                            <SelectLabel>
                              {planPeriodLabel[period]}
                            </SelectLabel>
                            {plans
                              .filter((p) => p.period === period)
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.frequencyLabel} —{' '}
                                  {formatCurrency(p.price)}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPlan ? (
                      <p className="text-xs text-muted-foreground">
                        Valor do plano {formatCurrency(selectedPlan.price)}
                        {form.discountPercent > 0
                          ? ` · −${form.discountPercent}% → ${formatCurrency(form.monthlyValue)}`
                          : ''}
                        {hasActiveContract
                          ? ` · agenda fixa até ${weeklyLimit}x/semana`
                          : ''}
                      </p>
                    ) : null}
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="edit-discount">
                        Desconto (%)
                      </FieldLabel>
                      <Input
                        id="edit-discount"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={form.discountPercent}
                        disabled={hasActiveContract}
                        onChange={(e) =>
                          handleDiscountChange(Number(e.target.value) || 0)
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-value">Valor final</FieldLabel>
                      <Input
                        id="edit-value"
                        type="number"
                        min={0}
                        step={10}
                        value={form.monthlyValue}
                        readOnly
                        className="bg-muted font-medium tabular-nums"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-due">Dia de vencimento</FieldLabel>
                      <Input
                        id="edit-due"
                        type="number"
                        min={1}
                        max={28}
                        value={form.dueDay}
                        disabled={hasActiveContract}
                        onChange={(e) =>
                          update(
                            'dueDay',
                            Math.min(28, Math.max(1, Number(e.target.value) || 1)),
                          )
                        }
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Forma de pagamento</FieldLabel>
                    <Select
                      value={form.paymentMethod}
                      disabled={hasActiveContract}
                      onValueChange={(v) =>
                        update(
                          'paymentMethod',
                          (v as PaymentMethod) ?? form.paymentMethod,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {paymentMethods.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="agenda" className="mt-0">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Field>
                      <FieldLabel>Dia</FieldLabel>
                      <Select
                        value={slotWeekday}
                        onValueChange={(v) =>
                          setSlotWeekday((v as Weekday) ?? 'Segunda')
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {weekdays.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Horário</FieldLabel>
                      <Select
                        value={slotTime}
                        onValueChange={(v) => setSlotTime(v ?? '08:00')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scheduleSlotOptions.length === 0 ? (
                            <SelectGroup>
                              <SelectItem value={slotTime} disabled>
                                Estúdio fechado neste dia
                              </SelectItem>
                            </SelectGroup>
                          ) : (
                            <SelectGroup>
                              {scheduleSlotOptions.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={addScheduleSlot}
                        disabled={
                          scheduleSlotOptions.length === 0 ||
                          form.schedule.length >= weeklyLimit
                        }
                      >
                        <Plus data-icon="inline-start" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {form.schedule.length === 0 ? (
                    <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                      Nenhum horário fixo. Adicione até {weeklyLimit} dia(s)
                      conforme o plano do contrato ativo.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {form.schedule.map((slot) => (
                        <div
                          key={`${slot.weekday}-${slot.time}`}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                        >
                          <Badge variant="outline" className="gap-1.5">
                            {slot.weekday} · {slot.time}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeScheduleSlot(slot)}
                            aria-label="Remover horário"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </FieldGroup>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-0 border-t" showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
