import { z } from 'zod'

export const assessmentTypes = ['Inicial', 'Reavaliação', 'Alta'] as const
export type AssessmentType = (typeof assessmentTypes)[number]

export const assessmentSpecialties = [
  'Pilates',
  'Fisioterapia',
  'Massoterapia',
  'Auriculoterapia',
  'Estética',
  'Avaliação',
  'Outro',
] as const

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
  assessmentType: z.enum(assessmentTypes).optional(),
  professional: z.string().optional().default(''),
  specialty: z.string().optional().default(''),
  service: z.string().optional().default(''),
  chiefComplaint: z.string().optional().default(''),
  painScale: z.number().int().min(0).max(10).optional().nullable(),
  affectedRegion: z.string().optional().default(''),
  functionalLimitations: z.string().optional().default(''),
  clinicalFindings: z.string().optional().default(''),
  testsPerformed: z.string().optional().default(''),
  testResults: z.string().optional().default(''),
  treatmentObjectives: z.string().optional().default(''),
  weeklyFrequency: z.string().optional().default(''),
  estimatedSessions: z.string().optional().default(''),
  plannedTechniques: z.string().optional().default(''),
  guidelines: z.string().optional().default(''),
  referrals: z.string().optional().default(''),
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
  assessmentType: z.enum(assessmentTypes).optional(),
  professional: z.string().optional(),
  specialty: z.string().optional(),
  service: z.string().optional(),
  chiefComplaint: z.string().optional(),
  painScale: z.number().int().min(0).max(10).optional().nullable(),
  affectedRegion: z.string().optional(),
  functionalLimitations: z.string().optional(),
  clinicalFindings: z.string().optional(),
  testsPerformed: z.string().optional(),
  testResults: z.string().optional(),
  treatmentObjectives: z.string().optional(),
  weeklyFrequency: z.string().optional(),
  estimatedSessions: z.string().optional(),
  plannedTechniques: z.string().optional(),
  guidelines: z.string().optional(),
  referrals: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  bodyFat: z.number().nonnegative().optional().nullable(),
  muscleMass: z.number().nonnegative().optional().nullable(),
  measures: measuresSchema.partial().optional(),
})

export type CreateAssessmentInput = z.input<typeof createAssessmentSchema>
export type UpdateAssessmentInput = z.input<typeof updateAssessmentSchema>
