import { z } from 'zod'

export const createEvolutionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  professional: z.string().optional().default(''),
  clinical: z.string().optional().default(''),
  complaints: z.string().optional().default(''),
  improvements: z.string().optional().default(''),
  exercises: z.string().optional().default(''),
  conduct: z.string().optional().default(''),
})

export const updateEvolutionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  professional: z.string().optional(),
  clinical: z.string().optional(),
  complaints: z.string().optional(),
  improvements: z.string().optional(),
  exercises: z.string().optional(),
  conduct: z.string().optional(),
})

export type CreateEvolutionInput = z.input<typeof createEvolutionSchema>
export type UpdateEvolutionInput = z.input<typeof updateEvolutionSchema>
