import { z } from 'zod'
import { weekdaySchema } from '@/lib/validations/student'

export const planPeriodSchema = z.enum(['mensal', 'trimestral', 'semestral'])
export const planKindSchema = z.enum(['mensalidade', 'pacote', 'avulso'])

export const createPlanSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).optional().default('Novo plano'),
  kind: planKindSchema.optional().default('mensalidade'),
  period: planPeriodSchema.optional().default('mensal'),
  frequency: z.number().int().min(1).max(3).optional().default(1),
  frequencyLabel: z.string().optional(),
  price: z.number().nonnegative().optional().default(0),
  sessionsTotal: z.number().int().positive().nullable().optional(),
})

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  kind: planKindSchema.optional(),
  period: planPeriodSchema.optional(),
  frequency: z.number().int().min(1).max(3).optional(),
  frequencyLabel: z.string().optional(),
  price: z.number().nonnegative().optional(),
  sessionsTotal: z.number().int().positive().nullable().optional(),
})

export const createProfessionalSchema = z.object({
  name: z.string().min(1).optional().default('Novo profissional'),
  role: z.string().optional().default('Instrutor'),
  registration: z.string().optional().default(''),
  email: z.union([z.string().email(), z.literal('')]).optional().default(''),
})

export const updateProfessionalSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  registration: z.string().optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
})

export const updateStudioSchema = z.object({
  name: z.string().min(1).optional(),
  owner: z.string().min(1).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  phone: z.string().optional(),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(['Essencial', 'Profissional', 'Studio']).optional(),
})

export const updateStudioHourSchema = z.object({
  weekday: weekdaySchema,
  open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closed: z.boolean().optional(),
})

export const timePeriodSchema = z.enum(['manha', 'tarde'])

export const createTimeSlotSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  period: timePeriodSchema,
  capacity: z.number().int().positive().optional().default(4),
})

export const updateTimeSlotSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  period: timePeriodSchema.optional(),
  capacity: z.number().int().positive().optional(),
})

export type CreatePlanInput = z.input<typeof createPlanSchema>
export type UpdatePlanInput = z.input<typeof updatePlanSchema>
export type CreateProfessionalInput = z.input<typeof createProfessionalSchema>
export type UpdateProfessionalInput = z.input<typeof updateProfessionalSchema>
export type UpdateStudioInput = z.input<typeof updateStudioSchema>
export type UpdateStudioHourInput = z.input<typeof updateStudioHourSchema>
export type CreateTimeSlotInput = z.input<typeof createTimeSlotSchema>
export type UpdateTimeSlotInput = z.input<typeof updateTimeSlotSchema>

export type TimeSlotDto = {
  id: string
  time: string
  period: 'manha' | 'tarde'
  capacity: number
}
