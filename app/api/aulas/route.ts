import { NextRequest } from 'next/server'
import { z } from 'zod'

import { handleRouteError, jsonOk } from '@/lib/api'
import { listStudioSessions } from '@/lib/sessions-service'

const typesSchema = z
  .string()
  .optional()
  .transform((value) =>
    value
      ? (value.split(',').filter(Boolean) as Array<
          'fixa' | 'avulsa' | 'reposicao' | 'experimental'
        >)
      : undefined,
  )

export async function GET(request: NextRequest) {
  try {
    const fromDate = request.nextUrl.searchParams.get('from') ?? undefined
    const toDate = request.nextUrl.searchParams.get('to') ?? undefined
    const types = typesSchema.parse(
      request.nextUrl.searchParams.get('types') ?? undefined,
    )
    const sessions = await listStudioSessions({ fromDate, toDate, types })
    return jsonOk(sessions)
  } catch (error) {
    return handleRouteError(error)
  }
}
