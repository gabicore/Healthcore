'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { InlineCell } from '@/components/financeiro/inline-cell'
import { Button } from '@/components/ui/button'
import {
  Card,
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
  type Plan,
  type PlanFrequency,
  type PlanPeriod,
} from '@/lib/data'
import {
  createPlan,
  deletePlan,
  fetchPlans,
  updatePlan,
} from '@/lib/settings-api'

const periodOptions = (
  Object.entries(planPeriodLabel) as [PlanPeriod, string][]
).map(([value, label]) => ({ value, label }))

const frequencyOptions = [
  { value: '1', label: '1x / semana' },
  { value: '2', label: '2x / semana' },
  { value: '3', label: '3x / semana' },
]

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function PlansSettingsPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null)

  const planList = useMemo(
    () =>
      plans
        ? [...plans].sort((a, b) => {
            const periodOrder = { semestral: 0, trimestral: 1, mensal: 2 }
            const byPeriod = periodOrder[a.period] - periodOrder[b.period]
            if (byPeriod !== 0) return byPeriod
            return a.frequency - b.frequency
          })
        : [],
    [plans],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const planRows = await fetchPlans()
        if (!cancelled) setPlans(planRows)
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            errorMessage(err, 'Não foi possível carregar os planos'),
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

  async function reloadPlans() {
    setPlans(await fetchPlans())
  }

  if (!plans) {
    return (
      <>
        <PageHeader
          title="Planos"
          description="Planos e valores oferecidos no estúdio"
        />
        <div className="p-4 text-sm text-muted-foreground md:p-6">
          Carregando planos…
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Planos"
        description="Planos e valores oferecidos no estúdio"
      >
        <Button
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
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Planos e valores</CardTitle>
            <CardDescription>
              Clique para editar · período, frequência e valor
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Sessões</TableHead>
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
                    {(plan.kind ?? 'mensalidade') === 'mensalidade' ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <InlineCell
                        type="number"
                        value={String(plan.sessionsTotal ?? 1)}
                        displayValue={String(plan.sessionsTotal ?? 1)}
                        className="tabular-nums"
                        onSave={async (raw) => {
                          try {
                            await updatePlan(plan.id, {
                              sessionsTotal: Math.max(1, Number(raw) || 1),
                            })
                            await reloadPlans()
                            notify('Sessões do pacote')
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
