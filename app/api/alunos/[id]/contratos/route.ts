import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonError, jsonOk } from '@/lib/api'
import {
  createContractRecord,
  listStudentContracts,
} from '@/lib/contracts-service'
import { createContractSchema } from '@/lib/validations/contract'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    return jsonOk(await listStudentContracts(id))
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = createContractSchema.parse(body)
    try {
      const created = await createContractRecord(id, input)
      return jsonCreated(created)
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Pessoa não encontrada' ||
          error.message === 'Plano não encontrado' ||
          error.message.includes('Já existe um contrato ativo'))
      ) {
        return jsonError(
          error.message,
          error.message === 'Pessoa não encontrada' ||
            error.message === 'Plano não encontrado'
            ? 404
            : 400,
        )
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
