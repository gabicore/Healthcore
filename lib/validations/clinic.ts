import { z } from 'zod'

export const serviceCategorySchema = z.enum([
  'pilates',
  'fisioterapia',
  'massoterapia',
  'auriculoterapia',
  'avaliacao',
  'experimental',
  'outro',
])

export const clinicalAttendanceStatusSchema = z.enum([
  'agendada',
  'realizada',
  'falta',
  'cancelada',
])

export const createServiceSchema = z.object({
  name: z.string().min(2),
  category: serviceCategorySchema,
  durationMinutes: z.number().int().positive().optional().default(60),
  price: z.number().nonnegative().optional().default(0),
  professionalId: z.string().optional().nullable(),
  requiresInitialAssessment: z.boolean().optional().default(false),
  requiresEvolution: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
})

export const updateServiceSchema = createServiceSchema.partial()

export const createClinicalAttendanceSchema = z.object({
  studentId: z.string().min(1),
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().positive().optional(),
  status: clinicalAttendanceStatusSchema.optional().default('agendada'),
  notes: z.string().optional(),
})

export const updateClinicalAttendanceSchema = z.object({
  studentId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  professionalId: z.string().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  durationMinutes: z.number().int().positive().optional(),
  status: clinicalAttendanceStatusSchema.optional(),
  notes: z.string().nullable().optional(),
})

export const createInventoryProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().default(''),
  lot: z.string().optional().default(''),
  expiresAt: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
    .optional()
    .nullable(),
  quantity: z.number().int().min(0).optional().default(0),
  minQuantity: z.number().int().min(0).optional().default(0),
  supplier: z.string().optional().default(''),
})

export const updateInventoryProductSchema =
  createInventoryProductSchema.partial()

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type CreateClinicalAttendanceInput = z.infer<
  typeof createClinicalAttendanceSchema
>
export type UpdateClinicalAttendanceInput = z.infer<
  typeof updateClinicalAttendanceSchema
>
export type CreateInventoryProductInput = z.infer<
  typeof createInventoryProductSchema
>
export type UpdateInventoryProductInput = z.infer<
  typeof updateInventoryProductSchema
>
