'use client'

import { useMemo, useState } from 'react'
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
  SLOT_CAPACITY,
  addTimeSlot,
  afternoonSlots,
  createPlan,
  createProfessional,
  formatCurrency,
  morningSlots,
  patchPlan,
  patchProfessional,
  patchStudio,
  patchStudioHour,
  planPeriodLabel,
  plans,
  professionals,
  removePlan,
  removeProfessional,
  removeTimeSlot,
  renameScheduleSlot,
  setSlotCapacity,
  studio,
  studioHours,
  weekdays,
  type PlanFrequency,
  type PlanPeriod,
  type Weekday,
} from '@/lib/data'

const periodOptions = (
  Object.entries(planPeriodLabel) as [PlanPeriod, string][]
).map(([value, label]) => ({ value, label }))

const frequencyOptions = [
  { value: '1', label: '1x / semana' },
  { value: '2', label: '2x / semana' },
  { value: '3', label: '3x / semana' },
]

export function SettingsPage() {
  const [version, setVersion] = useState(0)

  const studioData = useMemo(() => {
    void version
    return { ...studio }
  }, [version])

  const hours = useMemo(() => {
    void version
    return studioHours.map((h) => ({ ...h }))
  }, [version])

  const team = useMemo(() => {
    void version
    return professionals.map((p) => ({ ...p }))
  }, [version])

  const planList = useMemo(() => {
    void version
    return [...plans].sort((a, b) => {
      const periodOrder = { semestral: 0, trimestral: 1, mensal: 2 }
      const byPeriod = periodOrder[a.period] - periodOrder[b.period]
      if (byPeriod !== 0) return byPeriod
      return a.frequency - b.frequency
    })
  }, [version])

  const morning = useMemo(() => {
    void version
    return [...morningSlots]
  }, [version])

  const afternoon = useMemo(() => {
    void version
    return [...afternoonSlots]
  }, [version])

  const capacity = useMemo(() => {
    void version
    return SLOT_CAPACITY
  }, [version])

  function refresh() {
    setVersion((v) => v + 1)
  }

  function notify(label: string) {
    toast.success(`${label} atualizado`, {
      description:
        'A alteração será salva quando o banco de dados for conectado.',
      duration: 1800,
    })
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
                onSave={(name) => {
                  patchStudio({ name })
                  refresh()
                  notify('Nome')
                }}
              />
              <InlineField
                label="Responsável"
                value={studioData.owner}
                onSave={(owner) => {
                  patchStudio({ owner })
                  refresh()
                  notify('Responsável')
                }}
              />
              <InlineField
                label="E-mail"
                type="email"
                value={studioData.email}
                onSave={(email) => {
                  patchStudio({ email })
                  refresh()
                  notify('E-mail')
                }}
              />
              <InlineField
                label="Telefone"
                type="tel"
                value={studioData.phone}
                onSave={(phone) => {
                  patchStudio({ phone })
                  refresh()
                  notify('Telefone')
                }}
              />
              <div className="flex flex-col gap-0.5 py-2">
                <dt className="text-xs text-muted-foreground">Plano StudioFlow</dt>
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
                          onSave={(open) => {
                            const updated = patchStudioHour(weekday, { open })
                            if (!updated) {
                              toast.error('Horário inválido (use HH:MM)')
                              return
                            }
                            refresh()
                            notify('Abertura')
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineCell
                          value={hour.close}
                          className="font-mono tabular-nums"
                          onSave={(close) => {
                            const updated = patchStudioHour(weekday, { close })
                            if (!updated) {
                              toast.error('Horário inválido (use HH:MM)')
                              return
                            }
                            refresh()
                            notify('Fechamento')
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
                    onSave={(raw) => {
                      setSlotCapacity(Number(raw) || 1)
                      refresh()
                      notify('Capacidade')
                    }}
                  />
                </div>
              </div>

              <SlotGroup
                title="Manhã"
                slots={morning}
                onRename={(oldTime, next) => {
                  const result = renameScheduleSlot(oldTime, next)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  refresh()
                  notify('Horário')
                }}
                onAdd={() => {
                  const result = addTimeSlot('manha')
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  refresh()
                  toast.success('Horário adicionado', {
                    description: result.time,
                  })
                }}
                onRemove={(time) => {
                  const result = removeTimeSlot(time)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  refresh()
                  toast.success('Horário removido', { description: time })
                }}
              />

              <SlotGroup
                title="Tarde"
                slots={afternoon}
                onRename={(oldTime, next) => {
                  const result = renameScheduleSlot(oldTime, next)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  refresh()
                  notify('Horário')
                }}
                onAdd={() => {
                  const result = addTimeSlot('tarde')
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  refresh()
                  toast.success('Horário adicionado', {
                    description: result.time,
                  })
                }}
                onRemove={(time) => {
                  const result = removeTimeSlot(time)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  refresh()
                  toast.success('Horário removido', { description: time })
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
              onClick={() => {
                createProfessional()
                refresh()
                toast.success('Profissional adicionado')
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
                      onSave={(name) => {
                        if (!name) return
                        patchProfessional(professional.id, { name })
                        refresh()
                        notify('Nome')
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <InlineCell
                      value={professional.role}
                      onSave={(role) => {
                        patchProfessional(professional.id, { role })
                        refresh()
                        notify('Função')
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <InlineCell
                      value={professional.registration}
                      onSave={(registration) => {
                        patchProfessional(professional.id, { registration })
                        refresh()
                        notify('Registro')
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <InlineCell
                      value={professional.email}
                      onSave={(email) => {
                        patchProfessional(professional.id, { email })
                        refresh()
                        notify('E-mail')
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
                      onClick={() => {
                        if (!removeProfessional(professional.id)) {
                          toast.error('Mantenha ao menos um profissional')
                          return
                        }
                        refresh()
                        toast.success('Profissional removido', {
                          description: professional.name,
                        })
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
              onClick={() => {
                createPlan({ period: 'mensal', frequency: 1, price: 0 })
                refresh()
                toast.success('Plano adicionado')
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
                      onSave={(name) => {
                        if (!name) return
                        patchPlan(plan.id, { name })
                        refresh()
                        notify('Nome do plano')
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCell
                      type="select"
                      value={plan.period}
                      displayValue={planPeriodLabel[plan.period]}
                      options={periodOptions}
                      onSave={(period) => {
                        patchPlan(plan.id, { period: period as PlanPeriod })
                        refresh()
                        notify('Período')
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCell
                      type="select"
                      value={String(plan.frequency)}
                      displayValue={plan.frequencyLabel}
                      options={frequencyOptions}
                      onSave={(raw) => {
                        const frequency = Number(raw) as PlanFrequency
                        patchPlan(plan.id, { frequency })
                        refresh()
                        notify('Frequência')
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCell
                      type="number"
                      value={String(plan.price)}
                      displayValue={formatCurrency(plan.price)}
                      className="font-medium tabular-nums"
                      onSave={(raw) => {
                        patchPlan(plan.id, {
                          price: Math.max(0, Number(raw) || 0),
                        })
                        refresh()
                        notify('Valor')
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
                      onClick={() => {
                        const result = removePlan(plan.id)
                        if (!result.ok) {
                          toast.error(result.error)
                          return
                        }
                        refresh()
                        toast.success('Plano removido', {
                          description: plan.name,
                        })
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
  slots: string[]
  onRename: (oldTime: string, next: string) => void
  onAdd: () => void
  onRemove: (time: string) => void
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
        {slots.map((time) => (
          <div
            key={time}
            className="flex items-center gap-1 rounded-lg border bg-background px-1.5 py-1"
          >
            <InlineCell
              value={time}
              className="w-[4.5rem] font-mono text-sm tabular-nums"
              onSave={(next) => onRename(time, next)}
            />
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remover ${time}`}
              onClick={() => onRemove(time)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
