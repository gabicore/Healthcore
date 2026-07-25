import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deletePlanRecord,
  getPlanById,
  updatePlanRecord,
} from '@/lib/settings-service'
import { updatePlanSchema } from '@/lib/validations/settings'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const plan = await getPlanById(id)
    if (!plan) return jsonError('Plano não encontrado', 404)
    return jsonOk(plan)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = updatePlanSchema.parse(body)
    const updated = await updatePlanRecord(id, input)
    if (!updated) return jsonError('Plano não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    try {
      const ok = await deletePlanRecord(id)
      if (!ok) return jsonError('Plano não encontrado', 404)
      return jsonOk({ ok: true })
    } catch (error) {
      if (error instanceof Error && error.message.includes('em uso')) {
        return jsonError(error.message, 409)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
