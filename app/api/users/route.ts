import { NextRequest } from 'next/server'
import type { UserRole } from '@prisma/client'

import { handleRouteError, apiCreated } from '@/lib/api'
import { getRequestMeta, requireAdminSession } from '@/lib/auth/session'
import { registerUser } from '@/lib/auth/services/user-service'
import { registerUserSchema } from '@/lib/auth/validators/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession()
    const body = await request.json()
    const input = registerUserSchema.parse(body)
    const meta = getRequestMeta(request)
    const user = await registerUser(
      input,
      {
        id: session.user.id,
        role: (session.user as { role: UserRole }).role,
      },
      meta,
    )
    return apiCreated(user)
  } catch (error) {
    return handleRouteError(error)
  }
}
