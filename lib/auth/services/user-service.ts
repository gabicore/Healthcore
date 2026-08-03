import { randomUUID } from 'crypto'
import type { UserRole } from '@prisma/client'

import { AppError } from '@/lib/api'
import { toPublicUser } from '@/lib/auth/dto/user'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { ADMIN_ROLES } from '@/lib/auth/permissions'
import {
  accountRepository,
  authAuditRepository,
  sessionRepository,
  userRepository,
} from '@/lib/auth/repositories'
import type {
  ChangePasswordInput,
  RegisterUserInput,
} from '@/lib/auth/validators/auth'
import { prisma } from '@/lib/prisma'

export async function registerUser(
  input: RegisterUserInput,
  actor: { id: string; role: UserRole },
  meta?: { ip?: string | null; userAgent?: string | null },
) {
  const existing = await userRepository.findByEmail(input.email)
  if (existing) {
    throw new AppError('E-mail já cadastrado', 409, 'EMAIL_TAKEN')
  }

  if (input.professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: input.professionalId },
    })
    if (!professional) {
      throw new AppError('Profissional não encontrado', 404, 'NOT_FOUND')
    }
  }

  if (input.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
    })
    if (!student) {
      throw new AppError('Aluno não encontrado', 404, 'NOT_FOUND')
    }
  }

  const passwordHash = await hashPassword(input.password)
  const userId = randomUUID().replace(/-/g, '').slice(0, 24)

  const user = await userRepository.create({
    id: userId,
    name: input.name.trim(),
    email: input.email,
    emailVerified: false,
    role: input.role,
    professionalId: input.professionalId ?? null,
    studentId: input.studentId ?? null,
  })

  await accountRepository.createCredential({
    userId: user.id,
    accountId: user.id,
    passwordHash,
  })

  await authAuditRepository.create({
    userId: user.id,
    email: user.email,
    action: 'REGISTER',
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { by: actor.id, role: input.role },
  })

  return toPublicUser(user)
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  meta?: { ip?: string | null; userAgent?: string | null },
) {
  const account = await accountRepository.findCredentialByUserId(userId)
  if (!account?.password) {
    throw new AppError('Conta sem senha local', 400, 'NO_PASSWORD')
  }

  const valid = await verifyPassword(account.password, input.currentPassword)
  if (!valid) {
    throw new AppError('Senha atual incorreta', 400, 'INVALID_PASSWORD')
  }

  const passwordHash = await hashPassword(input.newPassword)
  await accountRepository.updatePassword(account.id, passwordHash)

  await authAuditRepository.create({
    userId,
    action: 'PASSWORD_CHANGE',
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  })

  return { ok: true as const }
}

/** Confirma que a senha corresponde a um administrador ativo (ADMIN / SUPER_ADMIN). */
export async function assertAdminPassword(password: string) {
  const trimmed = password.trim()
  if (!trimmed) {
    throw new AppError(
      'Informe a senha do administrador',
      400,
      'ADMIN_PASSWORD_REQUIRED',
    )
  }

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ADMIN_ROLES },
      status: 'ACTIVE',
    },
    include: {
      accounts: {
        where: { providerId: 'credential' },
        select: { password: true },
      },
    },
  })

  for (const admin of admins) {
    if (userRepository.isLocked(admin)) continue
    for (const account of admin.accounts) {
      if (!account.password) continue
      if (await verifyPassword(account.password, trimmed)) {
        return { id: admin.id, email: admin.email }
      }
    }
  }

  throw new AppError(
    'Senha do administrador incorreta',
    403,
    'INVALID_ADMIN_PASSWORD',
  )
}

export async function listUserSessions(userId: string, currentToken?: string) {
  const sessions = await sessionRepository.listByUser(userId)
  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    current: Boolean(currentToken && session.token === currentToken),
  }))
}

export async function revokeSession(
  userId: string,
  sessionId: string,
  meta?: { ip?: string | null; userAgent?: string | null },
) {
  const session = await sessionRepository.findById(sessionId)
  if (!session || session.userId !== userId) {
    throw new AppError('Sessão não encontrada', 404, 'NOT_FOUND')
  }
  await sessionRepository.deleteById(sessionId)
  await authAuditRepository.create({
    userId,
    action: 'SESSION_REVOKE',
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { sessionId },
  })
  return { ok: true as const }
}

export async function revokeOtherSessions(
  userId: string,
  keepToken: string,
  meta?: { ip?: string | null; userAgent?: string | null },
) {
  await sessionRepository.deleteOthers(userId, keepToken)
  await authAuditRepository.create({
    userId,
    action: 'SESSION_REVOKE',
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { scope: 'others' },
  })
  return { ok: true as const }
}

export async function getMe(userId: string) {
  const user = await userRepository.findById(userId)
  if (!user) throw new AppError('Usuário não encontrado', 404, 'NOT_FOUND')
  return toPublicUser(user)
}
