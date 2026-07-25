import { parseJson } from '@/lib/api-client'
import type { Campaign } from '@/lib/data'
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
} from '@/lib/validations/campaign'

export async function fetchCampaigns(): Promise<Campaign[]> {
  const response = await fetch('/api/campanhas', { cache: 'no-store' })
  return parseJson<Campaign[]>(response)
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<Campaign> {
  const response = await fetch('/api/campanhas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Campaign>(response)
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
): Promise<Campaign> {
  const response = await fetch(`/api/campanhas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Campaign>(response)
}

export async function duplicateCampaign(id: string): Promise<Campaign> {
  const response = await fetch(`/api/campanhas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'duplicate' }),
  })
  return parseJson<Campaign>(response)
}

export async function deleteCampaign(id: string): Promise<void> {
  const response = await fetch(`/api/campanhas/${id}`, { method: 'DELETE' })
  await parseJson<{ ok: boolean }>(response)
}
