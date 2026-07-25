import { parseJson } from '@/lib/api-client'
import type { PhysicalAssessment } from '@/lib/data'
import type {
  CreateAssessmentInput,
  UpdateAssessmentInput,
} from '@/lib/validations/assessment'

export async function fetchAssessments(
  studentId: string,
): Promise<PhysicalAssessment[]> {
  const response = await fetch(`/api/alunos/${studentId}/avaliacoes`, {
    cache: 'no-store',
  })
  return parseJson<PhysicalAssessment[]>(response)
}

export async function createAssessment(
  studentId: string,
  input: CreateAssessmentInput = {},
): Promise<PhysicalAssessment> {
  const response = await fetch(`/api/alunos/${studentId}/avaliacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<PhysicalAssessment>(response)
}

export async function updateAssessment(
  studentId: string,
  assessmentId: string,
  input: UpdateAssessmentInput,
): Promise<PhysicalAssessment> {
  const response = await fetch(
    `/api/alunos/${studentId}/avaliacoes/${assessmentId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return parseJson<PhysicalAssessment>(response)
}

export async function deleteAssessment(
  studentId: string,
  assessmentId: string,
): Promise<void> {
  const response = await fetch(
    `/api/alunos/${studentId}/avaliacoes/${assessmentId}`,
    { method: 'DELETE' },
  )
  await parseJson<{ ok: boolean }>(response)
}
