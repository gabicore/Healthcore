import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteEvolutionRecord,
  getEvolutionById,
  updateEvolutionRecord,
} from '@/lib/evolutions-service'
import { updateEvolutionSchema } from '@/lib/validations/evolution'

type RouteContext = {
  params: Promise<{ id: string; evolutionId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { evolutionId } = await context.params
    const row = await getEvolutionById(evolutionId)
    if (!row) return jsonError('Evolução não encontrada', 404)
    return jsonOk(row)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { evolutionId } = await context.params
    const body = await request.json()
    const input = updateEvolutionSchema.parse(body)
    const updated = await updateEvolutionRecord(evolutionId, input)
    if (!updated) return jsonError('Evolução não encontrada', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { evolutionId } = await context.params
    const ok = await deleteEvolutionRecord(evolutionId)
    if (!ok) return jsonError('Evolução não encontrada', 404)
    return jsonOk({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
