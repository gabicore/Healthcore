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

function suggestSlotTime(
  period: 'manha' | 'tarde',
  slots: TimeSlotDto[],
): string {
  const used = new Set(slots.map((s) => s.time))
  const count = slots.filter((s) => s.period === period).length
  let candidate =
    period === 'manha'
      ? `${String(7 + count).padStart(2, '0')}:00`
      : `${15 + count}:00`

  let guard = 0
  while (used.has(candidate) && guard < 24) {
    const [h, m] = candidate.split(':').map(Number)
    const next = h * 60 + m + 60
    candidate = `${String(Math.floor(next / 60) % 24).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`
    guard += 1
  }
  return candidate
}

export function SettingsPage() {
  const [studioData, setStudioData] = useState<StudioProfile | null>(null)
  const [hours, setHours] = useState<StudioHour[]>([])
  const [team, setTeam] = useState<Professional[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlotDto[]>([])

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
        setTeam(professionals)
        setPlans(planRows)
        setTimeSlots(slots)
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
    setTimeSlots(await fetchTimeSlots())
  }

  async function reloadPlans() {
    setPlans(await fetchPlans())
  }

  async function reloadProfessionals() {
    setTeam(await fetchProfessionals())
  }

  async function reloadHours() {
    setHours(await fetchStudioHours())
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
              Abertura e fechamento por dia · sábado só manhã na grade
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Dia</TableHead>
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
                      </TableCell>
                      <TableCell>
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
                    Horários disponíveis para marcar aulas
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

              <SlotGroup
                title="Manhã"
                slots={morning}
                onRename={async (slot, next) => {
                  const time = next.trim()
                  if (!TIME_RE.test(time)) {
                    toast.error('Use o formato HH:MM')
                    return
                  }
                  if (time === slot.time) return
                  try {
                    await updateTimeSlot(slot.id, { time })
                    await reloadTimeSlots()
                    notify('Horário')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível renomear'))
                  }
                }}
                onAdd={async () => {
                  const time = suggestSlotTime('manha', timeSlots)
                  try {
                    const created = await createTimeSlot({
                      time,
                      period: 'manha',
                      capacity,
                    })
                    await reloadTimeSlots()
                    toast.success('Horário adicionado', {
                      description: created.time,
                    })
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível adicionar'))
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
                  const time = next.trim()
                  if (!TIME_RE.test(time)) {
                    toast.error('Use o formato HH:MM')
                    return
                  }
                  if (time === slot.time) return
                  try {
                    await updateTimeSlot(slot.id, { time })
                    await reloadTimeSlots()
                    notify('Horário')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível renomear'))
                  }
                }}
                onAdd={async () => {
                  const time = suggestSlotTime('tarde', timeSlots)
                  try {
                    const created = await createTimeSlot({
                      time,
                      period: 'tarde',
                      capacity,
                    })
                    await reloadTimeSlots()
                    toast.success('Horário adicionado', {
                      description: created.time,
                    })
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível adicionar'))
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
  onAdd,
  onRemove,
}: {
  title: string
  slots: TimeSlotDto[]
  onRename: (slot: TimeSlotDto, next: string) => void
  onAdd: () => void
  onRemove: (slot: TimeSlotDto) => void
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <Button type="button" size="xs" variant="outline" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          Horário
        </Button>
      </div>
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
    </div>
  )
}
