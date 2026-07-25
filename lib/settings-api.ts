import { parseJson } from '@/lib/api-client'
import type {
  Plan,
  Professional,
  StudioHour,
  StudioProfile,
} from '@/lib/data'
import type { TimeSlotDto } from '@/lib/validations/settings'
import type {
  CreatePlanInput,
  CreateProfessionalInput,
  CreateTimeSlotInput,
  UpdatePlanInput,
  UpdateProfessionalInput,
  UpdateStudioHourInput,
  UpdateStudioInput,
  UpdateTimeSlotInput,
} from '@/lib/validations/settings'

export async function fetchPlans(): Promise<Plan[]> {
  const response = await fetch('/api/planos', { cache: 'no-store' })
  return parseJson<Plan[]>(response)
}

export async function createPlan(input: CreatePlanInput = {}): Promise<Plan> {
  const response = await fetch('/api/planos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Plan>(response)
}

export async function updatePlan(
  id: string,
  input: UpdatePlanInput,
): Promise<Plan> {
  const response = await fetch(`/api/planos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Plan>(response)
}

export async function deletePlan(id: string): Promise<void> {
  const response = await fetch(`/api/planos/${id}`, { method: 'DELETE' })
  await parseJson<{ ok: boolean }>(response)
}

export async function fetchProfessionals(): Promise<Professional[]> {
  const response = await fetch('/api/profissionais', { cache: 'no-store' })
  return parseJson<Professional[]>(response)
}

export async function createProfessional(
  input: CreateProfessionalInput = {},
): Promise<Professional> {
  const response = await fetch('/api/profissionais', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Professional>(response)
}

export async function updateProfessional(
  id: string,
  input: UpdateProfessionalInput,
): Promise<Professional> {
  const response = await fetch(`/api/profissionais/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Professional>(response)
}

export async function deleteProfessional(id: string): Promise<void> {
  const response = await fetch(`/api/profissionais/${id}`, {
    method: 'DELETE',
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function fetchStudio(): Promise<StudioProfile> {
  const response = await fetch('/api/estudio', { cache: 'no-store' })
  return parseJson<StudioProfile>(response)
}

export async function updateStudio(
  input: UpdateStudioInput,
): Promise<StudioProfile> {
  const response = await fetch('/api/estudio', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<StudioProfile>(response)
}

export async function fetchStudioHours(): Promise<StudioHour[]> {
  const response = await fetch('/api/estudio/horarios', { cache: 'no-store' })
  return parseJson<StudioHour[]>(response)
}

export async function updateStudioHour(
  input: UpdateStudioHourInput,
): Promise<StudioHour> {
  const response = await fetch('/api/estudio/horarios', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<StudioHour>(response)
}

export async function fetchTimeSlots(): Promise<TimeSlotDto[]> {
  const response = await fetch('/api/horarios-grade', { cache: 'no-store' })
  return parseJson<TimeSlotDto[]>(response)
}

export async function createTimeSlot(
  input: CreateTimeSlotInput,
): Promise<TimeSlotDto> {
  const response = await fetch('/api/horarios-grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<TimeSlotDto>(response)
}

export async function updateTimeSlot(
  id: string,
  input: UpdateTimeSlotInput,
): Promise<TimeSlotDto> {
  const response = await fetch(`/api/horarios-grade/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<TimeSlotDto>(response)
}

export async function deleteTimeSlot(id: string): Promise<void> {
  const response = await fetch(`/api/horarios-grade/${id}`, {
    method: 'DELETE',
  })
  await parseJson<{ ok: boolean }>(response)
}
