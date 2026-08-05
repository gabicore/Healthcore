import type { StudioService } from '@/lib/clinic-types'
import { parseJson } from '@/lib/api-client'
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '@/lib/validations/clinic'

export async function fetchServices(params?: {
  active?: boolean
}): Promise<StudioService[]> {
  const search = new URLSearchParams()
  if (params?.active !== undefined) search.set('active', String(params.active))
  const qs = search.toString()
  const response = await fetch(`/api/servicos${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  })
  return parseJson<StudioService[]>(response)
}

export async function createService(
  input: CreateServiceInput,
): Promise<StudioService> {
  const response = await fetch('/api/servicos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<StudioService>(response)
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<StudioService> {
  const response = await fetch(`/api/servicos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<StudioService>(response)
}

export async function deleteService(id: string): Promise<{ id: string }> {
  const response = await fetch(`/api/servicos/${id}`, { method: 'DELETE' })
  return parseJson<{ id: string }>(response)
}
