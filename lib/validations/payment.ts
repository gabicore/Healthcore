import { z } from 'zod'
import { paymentMethodSchema } from '@/lib/validations/student'

export const paymentStatusSchema = z.enum(['pago', 'pendente', 'atrasado'])

export const createPaymentSchema = z.object({
  reference: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nonnegative(),
  status: paymentStatusSchema.optional().default('pendente'),
  method: paymentMethodSchema.optional(),
  paidAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
})

/** PATCH parcial — sem defaults que zerem campos omitidos. */
export const updatePaymentSchema = z.object({
  reference: z.string().min(1).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  amount: z.number().nonnegative().optional(),
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional().nullable(),
  paidAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
})

export type CreatePaymentInput = z.input<typeof createPaymentSchema>
export type UpdatePaymentInput = z.input<typeof updatePaymentSchema>
