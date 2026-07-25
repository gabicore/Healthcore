import type { Expense } from '@/lib/data'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  decimalToNumber,
  parseIsoDate,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/lib/validations/expense'
import type { Expense as DbExpense } from '@prisma/client'

export function serializeExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: decimalToNumber(row.amount),
    dueDay: row.dueDay,
    status: row.status,
    paidAt: row.paidAt ? toIsoDateOnly(row.paidAt) : undefined,
    recurring: row.recurring,
    notes: row.notes ?? undefined,
  }
}

export async function listExpenses() {
  const rows = await prisma.expense.findMany({
    where: { studioId: DEFAULT_STUDIO_ID },
    orderBy: { dueDay: 'asc' },
  })
  return rows.map(serializeExpense)
}

export async function getExpenseById(id: string) {
  const row = await prisma.expense.findUnique({ where: { id } })
  return row ? serializeExpense(row) : null
}

export async function createExpenseRecord(input: CreateExpenseInput) {
  const status = input.status ?? 'pendente'
  const created = await prisma.expense.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      name: (input.name ?? 'Nova conta').trim() || 'Nova conta',
      category: input.category ?? 'outros',
      amount: input.amount ?? 0,
      dueDay: input.dueDay ?? 1,
      status,
      recurring: input.recurring ?? true,
      notes: input.notes ?? null,
      paidAt:
        status === 'pago'
          ? parseIsoDate(
              input.paidAt ?? new Date().toISOString().slice(0, 10),
            )
          : null,
    },
  })
  return serializeExpense(created)
}

export async function updateExpenseRecord(
  id: string,
  input: UpdateExpenseInput,
) {
  const existing = await prisma.expense.findUnique({ where: { id } })
  if (!existing) return null

  let status = input.status ?? existing.status
  let paidAt = existing.paidAt

  if (input.status === 'pago') {
    status = 'pago'
    paidAt = input.paidAt
      ? parseIsoDate(input.paidAt)
      : (existing.paidAt ??
        parseIsoDate(new Date().toISOString().slice(0, 10)))
  } else if (input.status === 'pendente') {
    status = 'pendente'
    paidAt = null
  } else if (input.paidAt !== undefined) {
    if (input.paidAt === null) {
      status = 'pendente'
      paidAt = null
    } else {
      paidAt = parseIsoDate(input.paidAt)
      status = 'pago'
    }
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.dueDay !== undefined ? { dueDay: input.dueDay } : {}),
      ...(input.recurring !== undefined ? { recurring: input.recurring } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      status,
      paidAt,
    },
  })
  return serializeExpense(updated)
}

export async function deleteExpenseRecord(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.expense.delete({ where: { id } })
  return true
}
