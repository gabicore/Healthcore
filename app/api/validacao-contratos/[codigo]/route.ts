import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { getContractByValidationCode } from '@/lib/contracts-signing-service'

type RouteContext = {
  params: Promise<{ codigo: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { codigo } = await context.params
    const result = await getContractByValidationCode(
      decodeURIComponent(codigo),
    )
    if (!result.valid && result.message.includes('não encontrado')) {
      return jsonError(result.message, 404)
    }
    return jsonOk(result)
  } catch (error) {
    return handleRouteError(error)
  }
}
