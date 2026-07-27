import type { User, UserRole } from '@prisma/client'

export type PublicUserDto = {
  id: string
  name: string
  email: string
  role: UserRole
  status: User['status']
  emailVerified: boolean
  lastLoginAt: string | null
  professionalId: string | null
  studentId: string | null
}

export function toPublicUser(user: User): PublicUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    professionalId: user.professionalId,
    studentId: user.studentId,
  }
}

export type SessionDto = {
  id: string
  createdAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  current: boolean
}
