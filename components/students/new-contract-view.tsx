'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { PlanFrequencyPeriodFields } from '@/components/students/plan-frequency-period-fields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { createContract } from '@/lib/contracts-api'
import {
  contractEndDateForPeriod,
  contractTotalClasses,
  formatCurrency,
  formatPlanModalityLabel,
  formatShortDate,
  isMinor,
  paymentMethods,
  planPeriodMonths,
  studentChargedValue,
  toIsoDate,
  type PaymentMethod,
  type Plan,
  type Student,
} from '@/lib/data'
import { fetchPlans } from '@/lib/settings-api'

type NewContractViewProps = {
  student: Student
  hasActiveContract: boolean
  activeContractNumber?: string
}

export function NewContractView({
  student,
  hasActiveContract,
  activeContractNumber,
}: NewContractViewProps) {
  const router = useRouter()
  const backHref = `/alunos/${student.id}?tab=contratos`

  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [creating, setCreating] = useState(false)
  const [planId, setPlanId] = useState(student.planId || '')
  const [discount, setDiscount] = useState(student.discountPercent)
  const [startDate, setStartDate] = useState(toIsoDate(new Date()))
  const [endDate, setEndDate] = useState(toIsoDate(new Date()))
  const [dueDay, setDueDay] = useState(student.dueDay)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    student.paymentMethod,
  )
  const [financialResponsible, setFinancialResponsible] = useState(
    student.name,
  )
  const [planError, setPlanError] = useState<string | null>(null)
  const studentIsMinor = isMinor(student.birthDate)

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId],
  )
  const monthlyValue = useMemo(
    () => studentChargedValue(selectedPlan, discount),
    [selectedPlan, discount],
  )
  const totalClasses = useMemo(
    () =>
      selectedPlan && startDate && endDate
        ? contractTotalClasses({
            startDate,
            endDate,
            frequency: selectedPlan.frequency,
          })
        : 0,
    [selectedPlan, startDate, endDate],
  )

  useEffect(() => {
    let cancelled = false
    void fetchPlans()
      .then((data) => {
        if (cancelled) return
        setPlans(data)
        setPlanId((current) => current || student.planId || data[0]?.id || '')
      })
      .catch(() => {
        if (!cancelled) toast.error('Não foi possível carregar os planos')
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false)
      })
    return () => {
      cancelled = true
    }
  }, [student.planId])

  useEffect(() => {
    if (!selectedPlan || !startDate) return
    setEndDate(contractEndDateForPeriod(startDate, selectedPlan.period))
  }, [selectedPlan, startDate])

  function goBack() {
    router.push(backHref)
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (hasActiveContract) {
      toast.error('Contrato ativo existente', {
        description:
          'Encerre ou rescinda o contrato ativo antes de criar um novo.',
      })
      return
    }
    if (!planId) {
      setPlanError('Selecione um plano')
      toast.error('Selecione um plano')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Informe as datas de início e término')
      return
    }
    if (endDate < startDate) {
      toast.error('A data de término deve ser após o início')
      return
    }

    setCreating(true)
    try {
      const plan = plans.find((p) => p.id === planId)
      const created = await createContract(student.id, {
        planId,
        planLabel: plan ? formatPlanModalityLabel(plan) : undefined,
        startDate,
        endDate,
        monthlyValue,
        discountPercent: Math.min(100, Math.max(0, discount)),
        dueDay: Math.min(28, Math.max(1, dueDay)),
        paymentMethod,
        financialResponsible: studentIsMinor
          ? financialResponsible.trim() || student.name
          : student.name,
        status: 'rascunho',
      })
      toast.success('Contrato criado')
      router.push(`/alunos/${student.id}/contratos/${created.id}`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível criar o contrato',
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Novo contrato"
        description={`Rascunho para ${student.name}, com cláusulas padrão do estúdio`}
      >
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          Voltar
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        {hasActiveContract ? (
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Já existe um contrato ativo
            {activeContractNumber ? ` (${activeContractNumber})` : ''}. Encerre
            ou rescinda o atual antes de criar outro.
          </p>
        ) : null}

        <Card>
          <form onSubmit={(e) => void handleCreate(e)}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-end gap-2 space-y-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  creating ||
                  hasActiveContract ||
                  loadingPlans ||
                  !planId
                }
              >
                {creating ? 'Criando…' : 'Criar contrato'}
              </Button>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-4">
                <PlanFrequencyPeriodFields
                  plans={plans}
                  planId={planId}
                  disabled={loadingPlans || hasActiveContract}
                  error={planError}
                  onChange={(plan) => {
                    setPlanId(plan.id)
                    setPlanError(null)
                  }}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="contract-start">Início</FieldLabel>
                    <Input
                      id="contract-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      disabled={hasActiveContract}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="contract-end">Término</FieldLabel>
                    <Input
                      id="contract-end"
                      type="date"
                      value={endDate}
                      readOnly
                      className="bg-muted"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="contract-discount">
                      Desconto (%)
                    </FieldLabel>
                    <Input
                      id="contract-discount"
                      type="number"
                      min={0}
                      max={100}
                      value={discount}
                      onChange={(e) =>
                        setDiscount(
                          Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0),
                          ),
                        )
                      }
                      disabled={hasActiveContract}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Valor final</FieldLabel>
                    <Input
                      value={formatCurrency(monthlyValue)}
                      readOnly
                      className="bg-muted"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="contract-due">
                      Dia de vencimento
                    </FieldLabel>
                    <Input
                      id="contract-due"
                      type="number"
                      min={1}
                      max={28}
                      value={dueDay}
                      onChange={(e) =>
                        setDueDay(
                          Math.min(
                            28,
                            Math.max(1, Number(e.target.value) || 1),
                          ),
                        )
                      }
                      disabled={hasActiveContract}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Forma de pagamento</FieldLabel>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => {
                        if (v) setPaymentMethod(v as PaymentMethod)
                      }}
                      disabled={hasActiveContract}
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
                  {studentIsMinor ? (
                    <Field className="sm:col-span-2 lg:col-span-3">
                      <FieldLabel htmlFor="contract-responsible">
                        Responsável financeiro
                      </FieldLabel>
                      <Input
                        id="contract-responsible"
                        value={financialResponsible}
                        onChange={(e) =>
                          setFinancialResponsible(e.target.value)
                        }
                        placeholder="Nome do responsável"
                        disabled={hasActiveContract}
                      />
                    </Field>
                  ) : null}
                </div>

                {selectedPlan ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      {formatShortDate(startDate)} —{' '}
                      {formatShortDate(endDate)} ·{' '}
                      {planPeriodMonths(selectedPlan.period)}{' '}
                      {planPeriodMonths(selectedPlan.period) === 1
                        ? 'mês'
                        : 'meses'}{' '}
                      · {totalClasses} aulas ({selectedPlan.frequencyLabel})
                    </p>
                    <p>
                      Valor do plano {formatCurrency(selectedPlan.price)}
                      {discount > 0
                        ? ` · desconto ${discount}% → ${formatCurrency(monthlyValue)}`
                        : null}
                    </p>
                  </div>
                ) : null}
              </FieldGroup>
            </CardContent>
          </form>
        </Card>
      </div>
    </>
  )
}
