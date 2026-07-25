import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonError, jsonOk } from '@/lib/api'
import {
  createEvolutionRecord,
  listEvolutions,
} from '@/lib/evolutions-service'
import { createEvolutionSchema } from '@/lib/validations/evolution'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    return jsonOk(await listEvolutions(id))
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = createEvolutionSchema.parse(body)
    try {
      const created = await createEvolutionRecord(id, input)
      return jsonCreated(created)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Aluno não encontrado'
      ) {
        return jsonError(error.message, 404)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
