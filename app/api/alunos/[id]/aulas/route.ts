import { NextRequest } from 'next/server'
import { z } from 'zod'

import { handleRouteError, jsonCreated, jsonError, jsonOk } from '@/lib/api'
import {
  createStudentSessionRecord,
  listStudentSessions,
} from '@/lib/sessions-service'

type RouteContext = {
  params: Promise<{ id: string }>
}

const createSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  type: z
    .enum(['fixa', 'avulsa', 'reposicao', 'experimental'])
    .optional(),
  status: z
    .enum(['agendada', 'presente', 'falta', 'reposicao', 'cancelada'])
    .optional(),
  notes: z.string().optional(),
  professionalId: z.string().optional(),
  guestName: z.string().optional(),
})

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const fromDate = request.nextUrl.searchParams.get('from') ?? undefined
    const toDate = request.nextUrl.searchParams.get('to') ?? undefined
    const typesParam = request.nextUrl.searchParams.get('types')
    const types = typesParam
      ? (typesParam.split(',').filter(Boolean) as Array<
          'fixa' | 'avulsa' | 'reposicao' | 'experimental'
        >)
      : undefined
    const sessions = await listStudentSessions(id, { fromDate, toDate, types })
    return jsonOk(sessions)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = createSessionSchema.parse(body)
    try {
      const created = await createStudentSessionRecord(id, input)
      return jsonCreated(created)
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Aluno não encontrado' ||
          error.message.includes('inválida') ||
          error.message.includes('Reposição') ||
          error.message.includes('reposições') ||
          error.message.includes('vigência') ||
          error.message.includes('agenda fixa') ||
          error.message.includes('aula fixa'))
      ) {
        return jsonError(
          error.message,
          error.message === 'Aluno não encontrado' ? 404 : 400,
        )
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
