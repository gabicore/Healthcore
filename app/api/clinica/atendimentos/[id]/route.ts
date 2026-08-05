import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteClinicalAttendanceRecord,
  getClinicalAttendanceById,
  updateClinicalAttendanceRecord,
} from '@/lib/clinical-attendances-service'
import { updateClinicalAttendanceSchema } from '@/lib/validations/clinic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const row = await getClinicalAttendanceById(id)
    if (!row) return jsonError('Atendimento não encontrado', 404)
    return jsonOk(row)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const input = updateClinicalAttendanceSchema.parse(await request.json())
    try {
      const updated = await updateClinicalAttendanceRecord(id, input)
      if (!updated) return jsonError('Atendimento não encontrado', 404)
      return jsonOk(updated)
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('não encontrad') ||
          error.message.includes('horário') ||
          error.message.includes('domingo'))
      ) {
        return jsonError(
          error.message,
          error.message.includes('não encontrad') ? 404 : 400,
        )
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const deleted = await deleteClinicalAttendanceRecord(id)
    if (!deleted) return jsonError('Atendimento não encontrado', 404)
    return jsonOk(deleted)
  } catch (error) {
    return handleRouteError(error)
  }
}
