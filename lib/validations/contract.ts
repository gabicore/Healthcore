import { z } from 'zod'
import { paymentMethodSchema } from '@/lib/validations/student'

export const contractStatusSchema = z.enum([
  'rascunho',
  'pendente_assinatura',
  'ativo',
  'encerrado',
  'cancelado',
])

export const createContractSchema = z.object({
  planId: z.string().min(1),
  planLabel: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: contractStatusSchema.optional().default('rascunho'),
  monthlyValue: z.number().nonnegative().optional(),
  discountPercent: z.number().int().min(0).max(100).optional().default(0),
  discountNote: z.string().optional().nullable(),
  dueDay: z.number().int().min(1).max(28).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  financialResponsible: z.string().optional().default(''),
  lateFeePercent: z.number().optional().default(2),
  interestPercent: z.number().optional().default(1),
  clauses: z.array(z.string()).optional(),
})

export const updateContractSchema = z.object({
  planId: z.string().min(1).optional(),
  planLabel: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: contractStatusSchema.optional(),
  monthlyValue: z.number().nonnegative().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  discountNote: z.string().optional().nullable(),
  dueDay: z.number().int().min(1).max(28).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  financialResponsible: z.string().optional(),
  lateFeePercent: z.number().optional(),
  interestPercent: z.number().optional(),
  clauses: z.array(z.string()).optional(),
  signedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  signatureName: z.string().optional().nullable(),
  historyAction: z.string().optional(),
})

export type CreateContractInput = z.input<typeof createContractSchema>
export type UpdateContractInput = z.input<typeof updateContractSchema>
