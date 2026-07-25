import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteProfessionalRecord,
  updateProfessionalRecord,
} from '@/lib/settings-service'
import { updateProfessionalSchema } from '@/lib/validations/settings'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = updateProfessionalSchema.parse(body)
    const updated = await updateProfessionalRecord(id, input)
    if (!updated) return jsonError('Profissional não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    try {
      const ok = await deleteProfessionalRecord(id)
      if (!ok) return jsonError('Profissional não encontrado', 404)
      return jsonOk({ ok: true })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('ao menos um profissional')
      ) {
        return jsonError(error.message, 409)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
