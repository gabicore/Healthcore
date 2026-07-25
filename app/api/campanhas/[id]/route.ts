import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteCampaignRecord,
  duplicateCampaignRecord,
  getCampaignById,
  updateCampaignRecord,
} from '@/lib/campaigns-service'
import { updateCampaignSchema } from '@/lib/validations/campaign'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const row = await getCampaignById(id)
    if (!row) return jsonError('Campanha não encontrada', 404)
    return jsonOk(row)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    if (body?.action === 'duplicate') {
      const duplicated = await duplicateCampaignRecord(id)
      if (!duplicated) return jsonError('Campanha não encontrada', 404)
      return jsonOk(duplicated)
    }
    const input = updateCampaignSchema.parse(body)
    const updated = await updateCampaignRecord(id, input)
    if (!updated) return jsonError('Campanha não encontrada', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const ok = await deleteCampaignRecord(id)
    if (!ok) return jsonError('Campanha não encontrada', 404)
    return jsonOk({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
