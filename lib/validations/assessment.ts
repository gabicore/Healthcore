import { z } from 'zod'

const measuresSchema = z.object({
  armRight: z.number(),
  armLeft: z.number(),
  chest: z.number(),
  waist: z.number(),
  abdomen: z.number(),
  hip: z.number(),
  thighRight: z.number(),
  thighLeft: z.number(),
  calfRight: z.number(),
  calfLeft: z.number(),
})

export const createAssessmentSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  weight: z.number().nonnegative().optional().default(0),
  height: z.number().nonnegative().optional().default(0),
  bodyFat: z.number().nonnegative().optional().nullable(),
  muscleMass: z.number().nonnegative().optional().nullable(),
  measures: measuresSchema.optional(),
})

export const updateAssessmentSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  weight: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  bodyFat: z.number().nonnegative().optional().nullable(),
  muscleMass: z.number().nonnegative().optional().nullable(),
  measures: measuresSchema.partial().optional(),
})

export type CreateAssessmentInput = z.input<typeof createAssessmentSchema>
export type UpdateAssessmentInput = z.input<typeof updateAssessmentSchema>
