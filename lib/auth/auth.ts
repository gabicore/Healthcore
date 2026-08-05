import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'

import { emailSender } from '@/lib/auth/email'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import {
  authAuditRepository,
  userRepository,
} from '@/lib/auth/repositories'
import { prisma } from '@/lib/prisma'

const LOCK_MESSAGE =
  'Conta temporariamente bloqueada por tentativas inválidas. Tente novamente em alguns minutos.'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'mysql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'https://studiobalnorio.com.br',
    'https://www.studiobalnorio.com.br',
    'http://localhost:3000',
  ].filter(Boolean) as string[],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await emailSender.send({
        to: user.email,
        subject: 'Redefinição de senha — HealthCore',
        html: `<p>Olá ${user.name},</p><p>Para redefinir sua senha, acesse:</p><p><a href="${url}">${url}</a></p>`,
        text: `Redefina sua senha: ${url}`,
      })
      await authAuditRepository.create({
        userId: user.id,
        email: user.email,
        action: 'PASSWORD_RESET_REQUEST',
        metadata: { url },
      })
    },
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => verifyPassword(hash, password),
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await emailSender.send({
        to: user.email,
        subject: 'Verifique seu e-mail — HealthCore',
        html: `<p>Olá ${user.name},</p><p>Confirme seu e-mail:</p><p><a href="${url}">${url}</a></p>`,
        text: `Verifique seu e-mail: ${url}`,
      })
      await authAuditRepository.create({
        userId: user.id,
        email: user.email,
        action: 'EMAIL_VERIFY',
        metadata: { stage: 'sent', url },
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'RECEPTIONIST',
        input: false,
      },
      status: {
        type: 'string',
        required: true,
        defaultValue: 'ACTIVE',
        input: false,
      },
      failedAttempts: {
        type: 'number',
        required: true,
        defaultValue: 0,
        input: false,
      },
      lockedUntil: {
        type: 'date',
        required: false,
        input: false,
      },
      lastLoginAt: {
        type: 'date',
        required: false,
        input: false,
      },
      professionalId: {
        type: 'string',
        required: false,
        input: false,
      },
      studentId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') return

      const email =
        typeof ctx.body?.email === 'string'
          ? ctx.body.email.toLowerCase()
          : null
      if (!email) return

      const user = await userRepository.findByEmail(email)
      if (!user) return

      if (user.status === 'INACTIVE') {
        throw new APIError('FORBIDDEN', {
          message: 'Usuário inativo. Contate o administrador.',
        })
      }

      if (userRepository.isLocked(user)) {
        throw new APIError('FORBIDDEN', { message: LOCK_MESSAGE })
      }

      // Desbloqueio automático após o prazo
      if (
        user.status === 'LOCKED' &&
        user.lockedUntil &&
        user.lockedUntil.getTime() <= Date.now()
      ) {
        await userRepository.update(user.id, {
          status: 'ACTIVE',
          failedAttempts: 0,
          lockedUntil: null,
        })
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const email =
        typeof ctx.body?.email === 'string'
          ? ctx.body.email.toLowerCase()
          : null
      const ip =
        ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        ctx.headers?.get('x-real-ip') ||
        null
      const userAgent = ctx.headers?.get('user-agent') || null

      if (ctx.path === '/sign-in/email') {
        const returnedError = ctx.context.returned
        const failed =
          returnedError &&
          typeof returnedError === 'object' &&
          'message' in returnedError

        if (failed && email) {
          const updated = await userRepository.recordFailedLogin(email)
          await authAuditRepository.create({
            userId: updated?.id,
            email,
            action: 'LOGIN_FAILED',
            ip,
            userAgent,
            metadata: {
              failedAttempts: updated?.failedAttempts ?? null,
            },
          })
          if (updated && updated.failedAttempts >= 5) {
            await authAuditRepository.create({
              userId: updated.id,
              email,
              action: 'ACCOUNT_LOCK',
              ip,
              userAgent,
            })
          }
          return
        }

        const sessionUser = ctx.context.session?.user
        if (sessionUser?.id) {
          await userRepository.recordSuccessfulLogin(sessionUser.id)
          await authAuditRepository.create({
            userId: sessionUser.id,
            email: sessionUser.email,
            action: 'LOGIN_SUCCESS',
            ip,
            userAgent,
          })
        }
      }

      if (ctx.path === '/sign-out') {
        const sessionUser = ctx.context.session?.user
        await authAuditRepository.create({
          userId: sessionUser?.id,
          email: sessionUser?.email,
          action: 'LOGOUT',
          ip,
          userAgent,
        })
      }
    }),
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
