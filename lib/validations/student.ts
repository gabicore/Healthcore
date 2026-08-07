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
  profession: z.string().optional().default(''),
  convenio: z.boolean().optional().default(false),
  convenioCarteirinha: z.string().optional().default(''),
  convenioProduto: z.string().optional().default(''),
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
  allergies: z.string().optional().default(''),
  implants: z.string().optional().default(''),
  clinicalAlerts: z.array(z.string().min(1)).optional().default([]),
  physicalActivity: z.string().optional().default(''),
  smoking: z.string().optional().default(''),
  alcoholUse: z.string().optional().default(''),
  hydration: z.string().optional().default(''),
  workPosture: z.string().optional().default(''),
  workHours: z.string().optional().default(''),
  sleepHours: z.string().optional().default(''),
  sleepQuality: z.string().optional().default(''),
  insomnia: z.string().optional().default(''),
  previousTreatments: z.string().optional().default(''),
  previousTreatmentFrequency: z.string().optional().default(''),
  treatmentResults: z.string().optional().default(''),
  treatmentInterruptions: z.string().optional().default(''),
  treatmentResponse: z.string().optional().default(''),
  dischargeReason: z.string().optional().default(''),
  exams: z.string().optional().default(''),
  medicalReports: z.string().optional().default(''),
  mriExams: z.string().optional().default(''),
  xrayExams: z.string().optional().default(''),
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
  profession: z.string().optional(),
  convenio: z.boolean().optional(),
  convenioCarteirinha: z.string().optional(),
  convenioProduto: z.string().optional(),
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
  allergies: z.string().optional(),
  implants: z.string().optional(),
  clinicalAlerts: z.array(z.string().min(1)).optional(),
  physicalActivity: z.string().optional(),
  smoking: z.string().optional(),
  alcoholUse: z.string().optional(),
  hydration: z.string().optional(),
  workPosture: z.string().optional(),
  workHours: z.string().optional(),
  sleepHours: z.string().optional(),
  sleepQuality: z.string().optional(),
  insomnia: z.string().optional(),
  previousTreatments: z.string().optional(),
  previousTreatmentFrequency: z.string().optional(),
  treatmentResults: z.string().optional(),
  treatmentInterruptions: z.string().optional(),
  treatmentResponse: z.string().optional(),
  dischargeReason: z.string().optional(),
  exams: z.string().optional(),
  medicalReports: z.string().optional(),
  mriExams: z.string().optional(),
  xrayExams: z.string().optional(),
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
