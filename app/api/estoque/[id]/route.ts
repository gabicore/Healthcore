import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteInventoryProductRecord,
  updateInventoryProductRecord,
} from '@/lib/inventory-service'
import { updateInventoryProductSchema } from '@/lib/validations/clinic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const input = updateInventoryProductSchema.parse(await request.json())
    const updated = await updateInventoryProductRecord(id, input)
    if (!updated) return jsonError('Produto não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const deleted = await deleteInventoryProductRecord(id)
    if (!deleted) return jsonError('Produto não encontrado', 404)
    return jsonOk(deleted)
  } catch (error) {
    return handleRouteError(error)
  }
}
