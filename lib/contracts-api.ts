import { parseJson } from '@/lib/api-client'
import type { Contract } from '@/lib/data'
import type {
  CreateContractInput,
  UpdateContractInput,
} from '@/lib/validations/contract'

export async function fetchStudentContracts(
  studentId: string,
): Promise<Contract[]> {
  const response = await fetch(`/api/alunos/${studentId}/contratos`, {
    cache: 'no-store',
  })
  return parseJson<Contract[]>(response)
}

export async function createContract(
  studentId: string,
  input: CreateContractInput,
): Promise<Contract> {
  const response = await fetch(`/api/alunos/${studentId}/contratos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Contract>(response)
}

export async function updateContract(
  id: string,
  input: UpdateContractInput,
): Promise<Contract> {
  const response = await fetch(`/api/contratos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Contract>(response)
}

export async function contractAction(
  id: string,
  action: 'send' | 'rescind' | 'renew' | 'sign' | 'email',
  payload?: { signatureName?: string },
): Promise<
  | Contract
  | {
      contract: Contract
      emailedTo: string
      transport: 'resend' | 'smtp' | 'console'
    }
> {
  const response = await fetch(`/api/contratos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  return parseJson(response)
}

export async function deleteContract(id: string): Promise<void> {
  const response = await fetch(`/api/contratos/${id}`, { method: 'DELETE' })
  await parseJson<{ ok: boolean }>(response)
}
