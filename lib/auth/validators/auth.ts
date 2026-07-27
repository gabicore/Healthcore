import { z } from 'zod'

export const userRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'RECEPTIONIST',
  'PROFESSIONAL',
  'FINANCIAL',
  'STUDENT',
  'RESPONSIBLE',
])

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional().default(false),
})

export const registerUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Inclua ao menos um número'),
  role: userRoleSchema,
  professionalId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Inclua ao menos um número'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Inclua ao menos um número'),
})

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1),
})

export type LoginInput = z.input<typeof loginSchema>
export type RegisterUserInput = z.input<typeof registerUserSchema>
export type ChangePasswordInput = z.input<typeof changePasswordSchema>
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>
