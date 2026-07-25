import type {
  PaymentMethod as AppPaymentMethod,
  Weekday as AppWeekday,
} from '@/lib/data'
import type { PaymentMethod, Weekday } from '@prisma/client'

const weekdayToDb: Record<AppWeekday, Weekday> = {
  Segunda: 'Segunda',
  Terça: 'Terca',
  Quarta: 'Quarta',
  Quinta: 'Quinta',
  Sexta: 'Sexta',
  Sábado: 'Sabado',
}

const weekdayFromDb: Record<Weekday, AppWeekday> = {
  Segunda: 'Segunda',
  Terca: 'Terça',
  Quarta: 'Quarta',
  Quinta: 'Quinta',
  Sexta: 'Sexta',
  Sabado: 'Sábado',
}

const paymentToDb: Record<AppPaymentMethod, PaymentMethod> = {
  PIX: 'PIX',
  'Cartão de crédito': 'CartaoCredito',
  Boleto: 'Boleto',
  Dinheiro: 'Dinheiro',
}

const paymentFromDb: Record<PaymentMethod, AppPaymentMethod> = {
  PIX: 'PIX',
  CartaoCredito: 'Cartão de crédito',
  Boleto: 'Boleto',
  Dinheiro: 'Dinheiro',
}

export function toDbWeekday(value: AppWeekday): Weekday {
  return weekdayToDb[value]
}

export function fromDbWeekday(value: Weekday): AppWeekday {
  return weekdayFromDb[value]
}

export function toDbPaymentMethod(value: AppPaymentMethod): PaymentMethod {
  return paymentToDb[value]
}

export function fromDbPaymentMethod(value: PaymentMethod): AppPaymentMethod {
  return paymentFromDb[value]
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function decimalToNumber(value: { toNumber?: () => number } | number | string) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (value && typeof value.toNumber === 'function') return value.toNumber()
  return Number(value)
}
