import { NextRequest } from 'next/server'

import { handleRouteError, apiOk } from '@/lib/api'
import { getRequestMeta, requireSession } from '@/lib/auth/session'
import { changePassword } from '@/lib/auth/services/user-service'
import { changePasswordSchema } from '@/lib/auth/validators/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const input = changePasswordSchema.parse(body)
    const result = await changePassword(
      session.user.id,
      input,
      getRequestMeta(request),
    )
    return apiOk(result)
  } catch (error) {
    return handleRouteError(error)
  }
}
