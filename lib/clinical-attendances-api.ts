import type { ClinicalAttendance } from '@/lib/clinic-types'
import { parseJson } from '@/lib/api-client'
import type {
  CreateClinicalAttendanceInput,
  UpdateClinicalAttendanceInput,
} from '@/lib/validations/clinic'

export async function fetchClinicalAttendances(params?: {
  from?: string
  to?: string
  studentId?: string
  serviceId?: string
}): Promise<ClinicalAttendance[]> {
  const search = new URLSearchParams()
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  if (params?.studentId) search.set('studentId', params.studentId)
  if (params?.serviceId) search.set('serviceId', params.serviceId)
  const qs = search.toString()
  const response = await fetch(
    `/api/clinica/atendimentos${qs ? `?${qs}` : ''}`,
    { cache: 'no-store' },
  )
  return parseJson<ClinicalAttendance[]>(response)
}

export async function createClinicalAttendance(
  input: CreateClinicalAttendanceInput,
): Promise<ClinicalAttendance> {
  const response = await fetch('/api/clinica/atendimentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<ClinicalAttendance>(response)
}

export async function updateClinicalAttendance(
  id: string,
  input: UpdateClinicalAttendanceInput,
): Promise<ClinicalAttendance> {
  const response = await fetch(`/api/clinica/atendimentos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<ClinicalAttendance>(response)
}

export async function deleteClinicalAttendance(
  id: string,
): Promise<{ id: string }> {
  const response = await fetch(`/api/clinica/atendimentos/${id}`, {
    method: 'DELETE',
  })
  return parseJson<{ id: string }>(response)
}
