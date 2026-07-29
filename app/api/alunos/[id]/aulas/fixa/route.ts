import { NextRequest } from 'next/server'
import { z } from 'zod'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { upsertFixedSessionAttendance } from '@/lib/sessions-service'

type RouteContext = {
  params: Promise<{ id: string }>
}

const upsertFixedSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  weekday: z.enum([
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ]),
  status: z.enum([
    'agendada',
    'presente',
    'falta',
    'reposicao',
    'cancelada',
  ]),
  notes: z.string().nullable().optional(),
})

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = upsertFixedSchema.parse(body)
    const updated = await upsertFixedSessionAttendance(id, input)
    return jsonOk(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Aluno não encontrado') {
      return jsonError(error.message, 404)
    }
    return handleRouteError(error)
  }
}
