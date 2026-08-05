import type { Payment } from '@/lib/data'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import {
  decimalToNumber,
  fromDbPaymentMethod,
  parseIsoDate,
  toDbPaymentMethod,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import { serializePayments } from '@/lib/serializers/student'
import type {
  CreatePaymentInput,
  UpdatePaymentInput,
} from '@/lib/validations/payment'
import type { Payment as DbPayment } from '@prisma/client'

function serializeOne(payment: DbPayment): Payment {
  return serializePayments([payment])[0]
}

export async function listStudentPayments(studentId: string) {
  const payments = await prisma.payment.findMany({
    where: { studentId },
    orderBy: { dueDate: 'desc' },
  })
  return serializePayments(payments)
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } })
  return payment ? serializeOne(payment) : null
}

export async function createPaymentRecord(
  studentId: string,
  input: CreatePaymentInput,
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) throw new Error('Pessoa não encontrada')

  const status = input.status ?? 'pendente'
  const method =
    status === 'pago'
      ? toDbPaymentMethod(
          input.method ?? fromDbPaymentMethod(student.paymentMethod),
        )
      : input.method
        ? toDbPaymentMethod(input.method)
        : null
  const paidAt =
    status === 'pago'
      ? parseIsoDate(input.paidAt ?? new Date().toISOString().slice(0, 10))
      : null

  const created = await prisma.payment.create({
    data: {
      studentId,
      reference: input.reference.trim(),
      dueDate: parseIsoDate(input.dueDate),
      amount: input.amount,
      status,
      method,
      paidAt,
    },
  })
  return serializeOne(created)
}

/**
 * Atualiza pagamento mantendo status/forma/data sincronizados
 * (mesma regra do mock setPaymentStatus / setPaymentMethod / setPaymentPaidAt).
 */
export async function updatePaymentRecord(
  id: string,
  input: UpdatePaymentInput,
) {
  const existing = await prisma.payment.findUnique({
    where: { id },
    include: { student: true },
  })
  if (!existing) return null

  let status = input.status ?? existing.status
  let method = existing.method
  let paidAt = existing.paidAt

  if (input.status !== undefined) {
    if (input.status === 'pago') {
      status = 'pago'
      paidAt = input.paidAt
        ? parseIsoDate(input.paidAt)
        : (existing.paidAt ??
          parseIsoDate(new Date().toISOString().slice(0, 10)))
      method = input.method
        ? toDbPaymentMethod(input.method)
        : (existing.method ?? existing.student.paymentMethod)
    } else {
      status = input.status
      paidAt = null
      method = null
    }
  } else if (input.method !== undefined && input.method !== null) {
    status = 'pago'
    method = toDbPaymentMethod(input.method)
    paidAt = input.paidAt
      ? parseIsoDate(input.paidAt)
      : (existing.paidAt ??
        parseIsoDate(new Date().toISOString().slice(0, 10)))
  } else if (input.paidAt !== undefined) {
    if (input.paidAt === null) {
      status = 'pendente'
      paidAt = null
      method = null
    } else {
      status = 'pago'
      paidAt = parseIsoDate(input.paidAt)
      method =
        input.method != null
          ? toDbPaymentMethod(input.method)
          : (existing.method ?? existing.student.paymentMethod)
    }
  } else if (input.method === null) {
    method = null
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      ...(input.reference !== undefined
        ? { reference: input.reference.trim() }
        : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: parseIsoDate(input.dueDate) }
        : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      status,
      method,
      paidAt,
    },
  })

  return serializeOne(updated)
}

export async function deletePaymentRecord(id: string) {
  const existing = await prisma.payment.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.payment.delete({ where: { id } })
  return true
}

export async function listStudioPayments() {
  const payments = await prisma.payment.findMany({
    where: { student: { studioId: DEFAULT_STUDIO_ID } },
    include: { student: { select: { id: true, name: true, active: true } } },
    orderBy: { dueDate: 'desc' },
  })
  return payments.map((p) => ({
    ...serializeOne(p),
    studentId: p.studentId,
    studentName: p.student.name,
    studentActive: p.student.active,
    amount: decimalToNumber(p.amount),
    dueDate: toIsoDateOnly(p.dueDate),
  }))
}
