import { headers } from 'next/headers'
import type { UserRole } from '@prisma/client'

import { auth } from '@/lib/auth/auth'
import { AppError } from '@/lib/api'
import { canRegisterUsers } from '@/lib/auth/permissions'

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireSession() {
  const session = await getServerSession()
  if (!session?.user) {
    throw new AppError('Não autenticado', 401, 'UNAUTHORIZED')
  }
  return session
}

export async function requireAdminSession() {
  const session = await requireSession()
  const role = (session.user as { role?: UserRole }).role
  if (!role || !canRegisterUsers(role)) {
    throw new AppError('Sem permissão', 403, 'FORBIDDEN')
  }
  return session
}

export function getRequestMeta(request: Request) {
  return {
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null,
    userAgent: request.headers.get('user-agent'),
  }
}
