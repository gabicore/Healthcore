'use client'

import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  paymentStatusOptions,
  type AttendanceStatus,
  type PaymentStatus,
} from '@/lib/data'
import { cn } from '@/lib/utils'

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string; className: string }> = {
    pago: {
      label: 'Pago',
      className:
        'border-transparent bg-primary/12 text-primary [a&]:hover:bg-primary/20',
    },
    pendente: {
      label: 'Pendente',
      className:
        'border-transparent bg-chart-3/20 text-chart-3 [a&]:hover:bg-chart-3/30',
    },
    atrasado: {
      label: 'Atrasado',
      className:
        'border-transparent bg-destructive/12 text-destructive [a&]:hover:bg-destructive/20',
    },
  }
  const { label, className } = map[status]
  return (
    <Badge variant="outline" className={cn(className)}>
      {label}
    </Badge>
  )
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge
      variant="outline"
      className="border-transparent bg-primary/12 text-primary"
    >
      Ativo
    </Badge>
  ) : (
    <Badge variant="secondary">Inativo</Badge>
  )
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { label: string; className: string }> = {
    agendada: {
      label: 'Agendada',
      className: 'border-transparent bg-accent text-accent-foreground',
    },
    presente: {
      label: 'Presente',
      className: 'border-transparent bg-primary/12 text-primary',
    },
    falta: {
      label: 'Falta',
      className: 'border-transparent bg-destructive/12 text-destructive',
    },
    reposicao: {
      label: 'Reposição',
      className: 'border-transparent bg-chart-5/15 text-chart-5',
    },
    cancelada: {
      label: 'Cancelada',
      className: 'border-transparent bg-muted text-muted-foreground',
    },
  }
  const { label, className } = map[status]
  return (
    <Badge variant="outline" className={cn(className)}>
      {label}
    </Badge>
  )
}

const triggerTone: Record<PaymentStatus, string> = {
  pago: 'border-transparent bg-primary/12 text-primary',
  pendente: 'border-transparent bg-chart-3/20 text-chart-3',
  atrasado: 'border-transparent bg-destructive/12 text-destructive',
}

type PaymentStatusSelectProps = {
  value: PaymentStatus
  onChange: (status: PaymentStatus) => void
  size?: 'sm' | 'default'
  className?: string
  'aria-label'?: string
}

export function PaymentStatusSelect({
  value,
  onChange,
  size = 'sm',
  className,
  'aria-label': ariaLabel = 'Status financeiro',
}: PaymentStatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as PaymentStatus)
      }}
    >
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={cn(triggerTone[value], className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {paymentStatusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
