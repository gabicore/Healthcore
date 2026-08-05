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
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  effectiveTo: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
    .optional(),
})

export const createStudentSchema = z.object({
  name: z.string().min(2),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: sexSchema.default('Feminino'),
  cpf: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.union([z.string().email(), z.literal('')]).default(''),
  cep: z.string().optional().default(''),
  street: z.string().optional().default(''),
  addressNumber: z.string().optional().default(''),
  neighborhood: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  address: z.string().optional().default(''),
  emergencyName: z.string().optional().default(''),
  emergencyRelation: z.string().optional().default(''),
  emergencyPhone: z.string().optional().default(''),
  emergencyContact: z.string().optional().default(''),
  active: z.boolean().optional().default(false),
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
  usesPilates: z.boolean().optional().default(true),
  usesClinic: z.boolean().optional().default(true),
  planId: z.string().min(1).optional(),
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
  street: z.string().optional(),
  addressNumber: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
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
  usesPilates: z.boolean().optional(),
  usesClinic: z.boolean().optional(),
  planId: z.string().min(1).optional(),
  monthlyValue: z.number().nonnegative().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  schedule: z.array(scheduleSlotSchema).optional(),
  /** Data a partir da qual a nova grade passa a valer (YYYY-MM-DD). */
  scheduleEffectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Remove um período do histórico de horários (from + to). */
  deleteSchedulePeriod: z
    .object({
      effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      effectiveTo: z
        .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
        .optional()
        .default(null),
    })
    .optional(),
})

export type CreateStudentInput = z.input<typeof createStudentSchema>
export type UpdateStudentInput = z.input<typeof updateStudentSchema>
