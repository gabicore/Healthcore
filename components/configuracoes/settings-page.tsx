'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { InlineField } from '@/components/students/inline-field'
import { InlineCell } from '@/components/financeiro/inline-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
  formatCurrency,
  planPeriodLabel,
  weekdays,
  type Plan,
  type PlanFrequency,
  type PlanPeriod,
  type Professional,
  type StudioHour,
  type StudioProfile,
  type Weekday,
  replaceScheduleSlots,
  replaceStudioHours,
} from '@/lib/data'
import type { TimeSlotDto } from '@/lib/validations/settings'
import {
  createPlan,
  createProfessional,
  createTimeSlot,
  deletePlan,
  deleteProfessional,
  deleteTimeSlot,
  fetchPlans,
  fetchProfessionals,
  fetchStudio,
  fetchStudioHours,
  fetchTimeSlots,
  updatePlan,
  updateProfessional,
  updateStudio,
  updateStudioHour,
  updateTimeSlot,
} from '@/lib/settings-api'

const periodOptions = (
  Object.entries(planPeriodLabel) as [PlanPeriod, string][]
).map(([value, label]) => ({ value, label }))

const frequencyOptions = [
  { value: '1', label: '1x / semana' },
  { value: '2', label: '2x / semana' },
  { value: '3', label: '3x / semana' },
]

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

export function SettingsPage() {
  const [studioData, setStudioData] = useState<StudioProfile | null>(null)
  const [hours, setHours] = useState<StudioHour[]>([])
  const [team, setTeam] = useState<Professional[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlotDto[]>([])
  const [newSlotTime, setNewSlotTime] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)

  const planList = useMemo(
    () =>
      [...plans].sort((a, b) => {
        const periodOrder = { semestral: 0, trimestral: 1, mensal: 2 }
        const byPeriod = periodOrder[a.period] - periodOrder[b.period]
        if (byPeriod !== 0) return byPeriod
        return a.frequency - b.frequency
      }),
    [plans],
  )

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
        const [studio, studioHours, professionals, planRows, slots] =
          await Promise.all([
            fetchStudio(),
            fetchStudioHours(),
            fetchProfessionals(),
            fetchPlans(),
            fetchTimeSlots(),
          ])
        if (cancelled) return
        setStudioData(studio)
        setHours(studioHours)
        replaceStudioHours(studioHours)
        setTeam(professionals)
        setPlans(planRows)
        setTimeSlots(slots)
        replaceScheduleSlots(slots)
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            errorMessage(err, 'Não foi possível carregar as configurações'),
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

  async function reloadPlans() {
    setPlans(await fetchPlans())
  }

  async function reloadProfessionals() {
    setTeam(await fetchProfessionals())
  }

  async function reloadHours() {
    const next = await fetchStudioHours()
    setHours(next)
    replaceStudioHours(next)
  }

  if (!studioData) {
    return (
      <>
        <PageHeader
          title="Configurações"
          description="Planos, horários e equipe do estúdio"
        />
        <div className="p-4 text-sm text-muted-foreground md:p-6">
          Carregando configurações…
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Planos, horários e equipe do estúdio"
      />

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Estúdio</CardTitle>
            <CardDescription>
              Dados do espaço · clique para editar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              <InlineField
                label="Nome"
                value={studioData.name}
                onSave={async (name) => {
                  try {
                    setStudioData(await updateStudio({ name }))
                    notify('Nome')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="Responsável"
                value={studioData.owner}
                onSave={async (owner) => {
                  try {
                    setStudioData(await updateStudio({ owner }))
                    notify('Responsável')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="E-mail"
                type="email"
                value={studioData.email}
                onSave={async (email) => {
                  try {
                    setStudioData(await updateStudio({ email }))
                    notify('E-mail')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="Telefone"
                type="tel"
                value={studioData.phone}
                onSave={async (phone) => {
                  try {
                    setStudioData(await updateStudio({ phone }))
                    notify('Telefone')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="CNPJ"
                value={studioData.cnpj}
                placeholder="00.000.000/0000-00"
                onSave={async (cnpj) => {
                  try {
                    setStudioData(await updateStudio({ cnpj }))
                    notify('CNPJ')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="Endereço"
                value={studioData.address}
                className="sm:col-span-2 lg:col-span-3"
                onSave={async (address) => {
                  try {
                    setStudioData(await updateStudio({ address }))
                    notify('Endereço')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <div className="flex flex-col gap-0.5 py-2">
                <dt className="text-xs text-muted-foreground">Plano HealthCore</dt>
                <dd className="pt-1">
                  <Badge variant="outline">{studioData.plan}</Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários de funcionamento</CardTitle>
            <CardDescription>
              Abertura e fechamento por dia · marque Fechado quando não houver
              atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
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
                                  value === 'fechado' ? 'Dia fechado' : 'Dia aberto',
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

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Grade da agenda</h3>
                  <p className="text-xs text-muted-foreground">
                    Informe qualquer horário (ex.: 07:30, 11:00, 14:15)
                  </p>
                </div>
                <div className="w-36">
                  <InlineField
                    label="Capacidade / horário"
                    type="number"
                    value={String(capacity)}
                    displayValue={`${capacity} alunos`}
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
                        toast.error(
                          errorMessage(err, 'Não foi possível salvar'),
                        )
                      }
                    }}
                  />
                </div>
              </div>

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
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-4">
            <div>
              <CardTitle className="text-base">Profissionais</CardTitle>
              <CardDescription>
                Equipe disponível na agenda e evoluções
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                try {
                  await createProfessional()
                  await reloadProfessionals()
                  toast.success('Profissional adicionado')
                } catch (err) {
                  toast.error(errorMessage(err, 'Não foi possível adicionar'))
                }
              }}
            >
              <Plus data-icon="inline-start" />
              Adicionar
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Função</TableHead>
                <TableHead className="hidden md:table-cell">Registro</TableHead>
                <TableHead className="hidden lg:table-cell">E-mail</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell>
                    <InlineCell
                      value={professional.name}
                      className="font-medium"
                      onSave={async (name) => {
                        if (!name) return
                        try {
                          await updateProfessional(professional.id, { name })
                          await reloadProfessionals()
                          notify('Nome')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <InlineCell
                      value={professional.role}
                      onSave={async (role) => {
                        try {
                          await updateProfessional(professional.id, { role })
                          await reloadProfessionals()
                          notify('Função')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <InlineCell
                      value={professional.registration}
                      onSave={async (registration) => {
                        try {
                          await updateProfessional(professional.id, {
                            registration,
                          })
                          await reloadProfessionals()
                          notify('Registro')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <InlineCell
                      value={professional.email}
                      onSave={async (email) => {
                        try {
                          await updateProfessional(professional.id, { email })
                          await reloadProfessionals()
                          notify('E-mail')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Excluir ${professional.name}`}
                      onClick={async () => {
                        try {
                          await deleteProfessional(professional.id)
                          await reloadProfessionals()
                          toast.success('Profissional removido', {
                            description: professional.name,
                          })
                        } catch (err) {
                          toast.error(
                            errorMessage(
                              err,
                              'Mantenha ao menos um profissional',
                            ),
                          )
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-4">
            <div>
              <CardTitle className="text-base">Planos e valores</CardTitle>
              <CardDescription>
                Planos oferecidos aos alunos · clique para editar
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                try {
                  await createPlan({
                    period: 'mensal',
                    frequency: 1,
                    price: 0,
                  })
                  await reloadPlans()
                  toast.success('Plano adicionado')
                } catch (err) {
                  toast.error(errorMessage(err, 'Não foi possível adicionar'))
                }
              }}
            >
              <Plus data-icon="inline-start" />
              Adicionar plano
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {planList.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <InlineCell
                      value={plan.name}
                      className="font-medium"
                      onSave={async (name) => {
                        if (!name) return
                        try {
                          await updatePlan(plan.id, { name })
                          await reloadPlans()
                          notify('Nome do plano')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCell
                      type="select"
                      value={plan.period}
                      displayValue={planPeriodLabel[plan.period]}
                      options={periodOptions}
                      onSave={async (period) => {
                        try {
                          await updatePlan(plan.id, {
                            period: period as PlanPeriod,
                          })
                          await reloadPlans()
                          notify('Período')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCell
                      type="select"
                      value={String(plan.frequency)}
                      displayValue={plan.frequencyLabel}
                      options={frequencyOptions}
                      onSave={async (raw) => {
                        const frequency = Number(raw) as PlanFrequency
                        try {
                          await updatePlan(plan.id, { frequency })
                          await reloadPlans()
                          notify('Frequência')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCell
                      type="number"
                      value={String(plan.price)}
                      displayValue={formatCurrency(plan.price)}
                      className="font-medium tabular-nums"
                      onSave={async (raw) => {
                        try {
                          await updatePlan(plan.id, {
                            price: Math.max(0, Number(raw) || 0),
                          })
                          await reloadPlans()
                          notify('Valor')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Excluir ${plan.name}`}
                      onClick={async () => {
                        try {
                          await deletePlan(plan.id)
                          await reloadPlans()
                          toast.success('Plano removido', {
                            description: plan.name,
                          })
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível remover'),
                          )
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
