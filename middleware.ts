import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'
import type { UserRole } from '@prisma/client'

import { canAccessPath } from '@/lib/auth/permissions'

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
  '/assinar-contrato',
  '/validar-contrato',
  '/api/assinatura-contratos',
  '/api/validacao-contratos',
]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)

  if (isPublic(pathname)) {
    if (sessionCookie && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        },
        { status: 401 },
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role fine-grained checks need session payload; cookie presence is enough
  // for edge gate. Server layouts/API enforce role via requireSession.
  const roleHeader = request.cookies.get('sf_role')?.value as UserRole | undefined
  if (roleHeader && !canAccessPath(roleHeader, pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
