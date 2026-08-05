import { NextRequest } from 'next/server'
import { z } from 'zod'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { updateSessionRecord } from '@/lib/sessions-service'

type RouteContext = {
  params: Promise<{ id: string; sessionId: string }>
}

const updateSessionSchema = z.object({
  status: z
    .enum(['agendada', 'presente', 'falta', 'reposicao', 'cancelada'])
    .optional(),
  notes: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params
    const body = await request.json()
    const input = updateSessionSchema.parse(body)
    try {
      const updated = await updateSessionRecord(sessionId, input)
      if (!updated) return jsonError('Aula não encontrada', 404)
      return jsonOk(updated)
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('vigência') ||
          error.message.includes('agenda fixa') ||
          error.message.includes('aula fixa') ||
          error.message.includes('Data inválida') ||
          error.message.includes('Profissional') ||
          error.message.includes('horário'))
      ) {
        return jsonError(error.message, 400)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
