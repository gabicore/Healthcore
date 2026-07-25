import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteTimeSlotRecord,
  updateTimeSlotRecord,
} from '@/lib/settings-service'
import { updateTimeSlotSchema } from '@/lib/validations/settings'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = updateTimeSlotSchema.parse(body)
    const updated = await updateTimeSlotRecord(id, input)
    if (!updated) return jsonError('Horário não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const ok = await deleteTimeSlotRecord(id)
    if (!ok) return jsonError('Horário não encontrado', 404)
    return jsonOk({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
