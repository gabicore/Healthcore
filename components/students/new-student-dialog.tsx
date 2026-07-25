'use client'

import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
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
  formatCurrency,
  getPlan,
  plans,
  planPeriodLabel,
  studentChargedValue,
} from '@/lib/data'

const periodOrder = ['semestral', 'trimestral', 'mensal'] as const

export function NewStudentDialog() {
  const [open, setOpen] = useState(false)
  const [planId, setPlanId] = useState('sem-2x')
  const [discountPercent, setDiscountPercent] = useState(0)

  const selectedPlan = useMemo(() => getPlan(planId), [planId])
  const finalValue = useMemo(
    () => studentChargedValue(selectedPlan, discountPercent),
    [selectedPlan, discountPercent],
  )

  function resetForm() {
    setPlanId('sem-2x')
    setDiscountPercent(0)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOpen(false)
    toast.success('Aluno cadastrado', {
      description: selectedPlan
        ? `Plano ${selectedPlan.name} · valor final ${formatCurrency(finalValue)}${
            discountPercent > 0 ? ` (−${discountPercent}%)` : ''
          }. Persistência quando o banco for conectado.`
        : 'O cadastro será salvo quando o banco de dados for conectado.',
    })
    resetForm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus data-icon="inline-start" />
            Novo aluno
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo aluno</DialogTitle>
          <DialogDescription>
            Preencha os dados principais. Você poderá completar o cadastro
            clínico depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nome completo</FieldLabel>
              <Input id="name" placeholder="Ex.: Maria da Silva" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="cpf">CPF</FieldLabel>
              <Input id="cpf" placeholder="000.000.000-00" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                <Input id="phone" placeholder="(11) 90000-0000" />
              </Field>
              <Field>
                <FieldLabel htmlFor="birth">Nascimento</FieldLabel>
                <Input id="birth" type="date" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input id="email" type="email" placeholder="email@exemplo.com" />
            </Field>
            <Field>
              <FieldLabel>Plano</FieldLabel>
              <Select
                value={planId}
                onValueChange={(v) => {
                  if (v) setPlanId(v)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {periodOrder.map((period) => (
                    <SelectGroup key={period}>
                      <SelectLabel>{planPeriodLabel[period]}</SelectLabel>
                      {plans
                        .filter((p) => p.period === period)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.frequencyLabel} — {formatCurrency(p.price)}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="discount">Desconto (%)</FieldLabel>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(
                      Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    )
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="final-value">Valor final</FieldLabel>
                <Input
                  id="final-value"
                  readOnly
                  value={formatCurrency(finalValue)}
                  className="bg-muted font-medium tabular-nums"
                />
              </Field>
            </div>
            {selectedPlan && discountPercent > 0 ? (
              <p className="text-xs text-muted-foreground">
                De {formatCurrency(selectedPlan.price)} com {discountPercent}%
                de desconto
              </p>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Cadastrar aluno</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
