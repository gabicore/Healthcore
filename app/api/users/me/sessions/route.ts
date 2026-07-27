import { NextRequest } from 'next/server'

import { handleRouteError, apiOk } from '@/lib/api'
import { getRequestMeta, requireSession } from '@/lib/auth/session'
import {
  listUserSessions,
  revokeOtherSessions,
  revokeSession,
} from '@/lib/auth/services/user-service'
import { revokeSessionSchema } from '@/lib/auth/validators/auth'

export async function GET() {
  try {
    const session = await requireSession()
    const sessions = await listUserSessions(
      session.user.id,
      session.session.token,
    )
    return apiOk(sessions)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession()
    const meta = getRequestMeta(request)
    const { searchParams } = request.nextUrl
    const allOthers = searchParams.get('others') === 'true'

    if (allOthers) {
      const result = await revokeOtherSessions(
        session.user.id,
        session.session.token,
        meta,
      )
      return apiOk(result)
    }

    const body = await request.json()
    const input = revokeSessionSchema.parse(body)
    const result = await revokeSession(session.user.id, input.sessionId, meta)
    return apiOk(result)
  } catch (error) {
    return handleRouteError(error)
  }
}
