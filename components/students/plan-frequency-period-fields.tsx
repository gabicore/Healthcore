'use client'

import { useMemo } from 'react'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatPlanModalityLabel,
  planPeriodsOrdered,
  type Plan,
} from '@/lib/data'

type PlanFrequencyPeriodFieldsProps = {
  plans: Plan[]
  planId: string
  disabled?: boolean
  error?: string | null
  onChange: (plan: Plan) => void
}

export function PlanFrequencyPeriodFields({
  plans,
  planId,
  disabled,
  error,
  onChange,
}: PlanFrequencyPeriodFieldsProps) {
  const orderedPlans = useMemo(() => {
    const periodRank = new Map(
      planPeriodsOrdered.map((period, index) => [period, index]),
    )
    return [...plans].sort((a, b) => {
      if (a.frequency !== b.frequency) return a.frequency - b.frequency
      return (
        (periodRank.get(a.period) ?? 99) - (periodRank.get(b.period) ?? 99)
      )
    })
  }, [plans])

  const selectedPlan = useMemo(
    () => orderedPlans.find((p) => p.id === planId) ?? null,
    [orderedPlans, planId],
  )

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel>Plano / modalidade</FieldLabel>
      <Select
        value={planId || null}
        onValueChange={(v) => {
          if (!v) return
          const plan = plans.find((p) => p.id === v)
          if (plan) onChange(plan)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-auto min-h-8 w-full whitespace-normal py-1.5 *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal"
          aria-invalid={!!error || undefined}
        >
          <SelectValue placeholder="Selecione aulas e período">
            {selectedPlan ? formatPlanModalityLabel(selectedPlan) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {orderedPlans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {formatPlanModalityLabel(p)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
