import type { UserRole } from '@prisma/client'

/** Rotas de UI e capacidades por role */
const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 90,
  FINANCIAL: 70,
  PROFESSIONAL: 60,
  RECEPTIONIST: 50,
  RESPONSIBLE: 30,
  STUDENT: 10,
}

export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN']

export const FINANCIAL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCIAL',
]

export const SETTINGS_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN']

export function hasMinRole(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (pathname.startsWith('/financeiro')) {
    return FINANCIAL_ROLES.includes(role)
  }
  if (pathname.startsWith('/configuracoes')) {
    return SETTINGS_ROLES.includes(role)
  }
  if (role === 'STUDENT' || role === 'RESPONSIBLE') {
    return pathname.startsWith('/alunos') || pathname === '/'
  }
  return true
}

export function canRegisterUsers(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role)
}
