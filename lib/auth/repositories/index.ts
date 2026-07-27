import type { AuthAuditAction, Prisma, UserRole, UserStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
  },

  create(data: {
    id?: string
    name: string
    email: string
    emailVerified?: boolean
    role: UserRole
    status?: UserStatus
    professionalId?: string | null
    studentId?: string | null
  }) {
    return prisma.user.create({
      data: {
        id: data.id,
        name: data.name,
        email: data.email.toLowerCase(),
        emailVerified: data.emailVerified ?? false,
        role: data.role,
        status: data.status ?? 'ACTIVE',
        professionalId: data.professionalId ?? null,
        studentId: data.studentId ?? null,
      },
    })
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data })
  },

  async recordFailedLogin(email: string) {
    const user = await this.findByEmail(email)
    if (!user) return null

    const failedAttempts = user.failedAttempts + 1
    const locked = failedAttempts >= 5
    return prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts,
        status: locked ? 'LOCKED' : user.status,
        lockedUntil: locked
          ? new Date(Date.now() + 15 * 60 * 1000)
          : user.lockedUntil,
      },
    })
  },

  async recordSuccessfulLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    })
  },

  isLocked(user: {
    status: UserStatus
    lockedUntil: Date | null
  }): boolean {
    if (user.status === 'LOCKED' && user.lockedUntil) {
      return user.lockedUntil.getTime() > Date.now()
    }
    if (user.status === 'LOCKED' && !user.lockedUntil) return true
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return true
    return false
  },
}

export const sessionRepository = {
  listByUser(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  findById(id: string) {
    return prisma.session.findUnique({ where: { id } })
  },

  deleteById(id: string) {
    return prisma.session.delete({ where: { id } })
  },

  deleteOthers(userId: string, keepToken: string) {
    return prisma.session.deleteMany({
      where: {
        userId,
        token: { not: keepToken },
      },
    })
  },

  deleteAll(userId: string) {
    return prisma.session.deleteMany({ where: { userId } })
  },
}

export const authAuditRepository = {
  create(data: {
    userId?: string | null
    email?: string | null
    action: AuthAuditAction
    ip?: string | null
    userAgent?: string | null
    metadata?: Prisma.InputJsonValue
  }) {
    return prisma.authAuditLog.create({
      data: {
        userId: data.userId ?? null,
        email: data.email?.toLowerCase() ?? null,
        action: data.action,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata ?? undefined,
      },
    })
  },
}

export const accountRepository = {
  findCredentialByUserId(userId: string) {
    return prisma.account.findFirst({
      where: { userId, providerId: 'credential' },
    })
  },

  updatePassword(accountId: string, passwordHash: string) {
    return prisma.account.update({
      where: { id: accountId },
      data: { password: passwordHash },
    })
  },

  createCredential(data: {
    userId: string
    accountId: string
    passwordHash: string
  }) {
    return prisma.account.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        providerId: 'credential',
        password: data.passwordHash,
      },
    })
  },
}
