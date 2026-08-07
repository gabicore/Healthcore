import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonError, jsonOk } from '@/lib/api'
import {
  createAssessmentRecord,
  listAssessments,
} from '@/lib/assessments-service'
import { createAssessmentSchema } from '@/lib/validations/assessment'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    return jsonOk(await listAssessments(id))
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = createAssessmentSchema.parse(body)
    try {
      const created = await createAssessmentRecord(id, input)
      return jsonCreated(created)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Pessoa não encontrada'
      ) {
        return jsonError(error.message, 404)
      }
      if (
        error instanceof Error &&
        (error.message.includes('contrato ativo') ||
          error.message.includes('avaliação inicial') ||
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
