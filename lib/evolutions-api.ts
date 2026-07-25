import { parseJson } from '@/lib/api-client'
import type { Evolution } from '@/lib/data'
import type {
  CreateEvolutionInput,
  UpdateEvolutionInput,
} from '@/lib/validations/evolution'

export async function fetchEvolutions(studentId: string): Promise<Evolution[]> {
  const response = await fetch(`/api/alunos/${studentId}/evolucoes`, {
    cache: 'no-store',
  })
  return parseJson<Evolution[]>(response)
}

export async function createEvolution(
  studentId: string,
  input: CreateEvolutionInput = {},
): Promise<Evolution> {
  const response = await fetch(`/api/alunos/${studentId}/evolucoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Evolution>(response)
}

export async function updateEvolution(
  studentId: string,
  evolutionId: string,
  input: UpdateEvolutionInput,
): Promise<Evolution> {
  const response = await fetch(
    `/api/alunos/${studentId}/evolucoes/${evolutionId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return parseJson<Evolution>(response)
}

export async function deleteEvolution(
  studentId: string,
  evolutionId: string,
): Promise<void> {
  const response = await fetch(
    `/api/alunos/${studentId}/evolucoes/${evolutionId}`,
    { method: 'DELETE' },
  )
  await parseJson<{ ok: boolean }>(response)
}
