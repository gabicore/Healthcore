import { parseJson } from '@/lib/api-client'
import type { Payment } from '@/lib/data'
import type {
  CreatePaymentInput,
  UpdatePaymentInput,
} from '@/lib/validations/payment'

export async function fetchStudentPayments(
  studentId: string,
): Promise<Payment[]> {
  const response = await fetch(`/api/alunos/${studentId}/pagamentos`, {
    cache: 'no-store',
  })
  return parseJson<Payment[]>(response)
}

export async function createPayment(
  studentId: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  const response = await fetch(`/api/alunos/${studentId}/pagamentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Payment>(response)
}

export async function updatePayment(
  id: string,
  input: UpdatePaymentInput,
): Promise<Payment> {
  const response = await fetch(`/api/pagamentos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Payment>(response)
}

export async function deletePayment(id: string): Promise<void> {
  const response = await fetch(`/api/pagamentos/${id}`, { method: 'DELETE' })
  await parseJson<{ ok: boolean }>(response)
}
