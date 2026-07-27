import { z } from 'zod'

export const sexSchema = z.enum(['Feminino', 'Masculino', 'Outro'])
export const paymentMethodSchema = z.enum([
  'PIX',
  'Cartão de crédito',
  'Boleto',
  'Dinheiro',
])
export const weekdaySchema = z.enum([
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
])

export const scheduleSlotSchema = z.object({
  weekday: weekdaySchema,
  time: z.string().regex(/^\d{2}:\d{2}$/),
})

export const createStudentSchema = z.object({
  name: z.string().min(2),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: sexSchema.default('Feminino'),
  cpf: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.union([z.string().email(), z.literal('')]).default(''),
  cep: z.string().optional().default(''),
  address: z.string().optional().default(''),
  emergencyContact: z.string().optional().default(''),
  active: z.boolean().optional().default(true),
  since: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  objective: z.string().optional().default(''),
  pathologies: z.string().optional().default(''),
  injuries: z.string().optional().default(''),
  surgeries: z.string().optional().default(''),
  restrictions: z.string().optional().default(''),
  medications: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  planId: z.string().min(1),
  monthlyValue: z.number().nonnegative().optional(),
  discountPercent: z.number().int().min(0).max(100).optional().default(0),
  dueDay: z.number().int().min(1).max(28).optional().default(10),
  paymentMethod: paymentMethodSchema.optional().default('PIX'),
  schedule: z.array(scheduleSlotSchema).optional().default([]),
})

/** PATCH parcial: sem `.default()` — defaults do create zeravam campos omitidos. */
export const updateStudentSchema = z.object({
  name: z.string().min(2).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sex: sexSchema.optional(),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  active: z.boolean().optional(),
  since: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  objective: z.string().optional(),
  pathologies: z.string().optional(),
  injuries: z.string().optional(),
  surgeries: z.string().optional(),
  restrictions: z.string().optional(),
  medications: z.string().optional(),
  notes: z.string().optional(),
  planId: z.string().min(1).optional(),
  monthlyValue: z.number().nonnegative().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  schedule: z.array(scheduleSlotSchema).optional(),
})

export type CreateStudentInput = z.input<typeof createStudentSchema>
export type UpdateStudentInput = z.input<typeof updateStudentSchema>
