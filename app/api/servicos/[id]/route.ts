import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteServiceRecord,
  getServiceById,
  updateServiceRecord,
} from '@/lib/services-service'
import { updateServiceSchema } from '@/lib/validations/clinic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const row = await getServiceById(id)
    if (!row) return jsonError('Serviço não encontrado', 404)
    return jsonOk(row)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const input = updateServiceSchema.parse(await request.json())
    const updated = await updateServiceRecord(id, input)
    if (!updated) return jsonError('Serviço não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const deleted = await deleteServiceRecord(id)
    if (!deleted) return jsonError('Serviço não encontrado', 404)
    return jsonOk(deleted)
  } catch (error) {
    return handleRouteError(error)
  }
}
