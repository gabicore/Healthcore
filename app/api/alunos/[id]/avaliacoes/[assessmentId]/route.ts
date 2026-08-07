import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteAssessmentRecord,
  getAssessmentById,
  updateAssessmentRecord,
} from '@/lib/assessments-service'
import { updateAssessmentSchema } from '@/lib/validations/assessment'

type RouteContext = {
  params: Promise<{ id: string; assessmentId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { assessmentId } = await context.params
    const row = await getAssessmentById(assessmentId)
    if (!row) return jsonError('Avaliação não encontrada', 404)
    return jsonOk(row)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { assessmentId } = await context.params
    const body = await request.json()
    const input = updateAssessmentSchema.parse(body)
    try {
      const updated = await updateAssessmentRecord(assessmentId, input)
      if (!updated) return jsonError('Avaliação não encontrada', 404)
      return jsonOk(updated)
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('avaliação inicial') ||
          error.message.includes('avaliação de alta'))
      ) {
        return jsonError(error.message, 400)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { assessmentId } = await context.params
    const ok = await deleteAssessmentRecord(assessmentId)
    if (!ok) return jsonError('Avaliação não encontrada', 404)
    return jsonOk({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
