import { NextRequest } from 'next/server'
import { z } from 'zod'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { listWeekAgenda } from '@/lib/sessions-service'

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      from: request.nextUrl.searchParams.get('from'),
      to: request.nextUrl.searchParams.get('to'),
    })
    if (!parsed.success) {
      return jsonError('Parâmetros from e to (YYYY-MM-DD) são obrigatórios', 400)
    }
    try {
      const agenda = await listWeekAgenda(parsed.data.from, parsed.data.to)
      return jsonOk(agenda)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Intervalo de datas')
      ) {
        return jsonError(error.message, 400)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
