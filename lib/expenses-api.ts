import { parseJson } from '@/lib/api-client'
import type { Expense } from '@/lib/data'
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/lib/validations/expense'

export async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch('/api/despesas', { cache: 'no-store' })
  return parseJson<Expense[]>(response)
}

export async function createExpense(
  input: CreateExpenseInput = {},
): Promise<Expense> {
  const response = await fetch('/api/despesas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Expense>(response)
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
): Promise<Expense> {
  const response = await fetch(`/api/despesas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Expense>(response)
}

export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`/api/despesas/${id}`, { method: 'DELETE' })
  await parseJson<{ ok: boolean }>(response)
}
