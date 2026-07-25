import { z } from 'zod'

export const expenseCategorySchema = z.enum([
  'aluguel',
  'contas',
  'pessoal',
  'material',
  'software',
  'outros',
])

export const expenseStatusSchema = z.enum(['pago', 'pendente'])

export const createExpenseSchema = z.object({
  name: z.string().min(1).optional().default('Nova conta'),
  category: expenseCategorySchema.optional().default('outros'),
  amount: z.number().nonnegative().optional().default(0),
  dueDay: z.number().int().min(1).max(28).optional().default(1),
  status: expenseStatusSchema.optional().default('pendente'),
  paidAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  recurring: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
})

export const updateExpenseSchema = z.object({
  name: z.string().min(1).optional(),
  category: expenseCategorySchema.optional(),
  amount: z.number().nonnegative().optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  status: expenseStatusSchema.optional(),
  paidAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  recurring: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export type CreateExpenseInput = z.input<typeof createExpenseSchema>
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>
