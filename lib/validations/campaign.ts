import { z } from 'zod'
import { campaignAudienceLabel } from '@/lib/data'

export const campaignTypeSchema = z.enum([
  'aniversarios',
  'eventos',
  'promocoes',
  'marketing',
  'whatsapp',
  'email',
  'fidelizacao',
  'reativacao',
])

export const campaignChannelSchema = z.enum([
  'whatsapp',
  'email',
  'sms',
  'interno',
])

export const campaignStatusSchema = z.enum([
  'rascunho',
  'agendada',
  'em_andamento',
  'pausada',
  'finalizada',
])

export const campaignAudienceSchema = z.enum([
  'todos',
  'ativos',
  'inativos',
  'aniversariantes',
  'inadimplentes',
  'responsaveis',
])

export const campaignAutomationSchema = z.enum([
  'aniversario',
  'lembrete',
  'pos_venda',
  'reativacao',
])

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['image', 'pdf']),
})

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  type: campaignTypeSchema.optional().default('marketing'),
  channel: campaignChannelSchema.optional().default('whatsapp'),
  audience: campaignAudienceSchema.optional().default('ativos'),
  audienceLabel: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  scheduledAt: z.string().optional().nullable(),
  status: campaignStatusSchema.optional().default('rascunho'),
  messageTemplate: z.string().optional().default(''),
  variables: z.array(z.string()).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
  automation: campaignAutomationSchema.optional().nullable(),
})

export const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  type: campaignTypeSchema.optional(),
  channel: campaignChannelSchema.optional(),
  audience: campaignAudienceSchema.optional(),
  audienceLabel: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  scheduledAt: z.string().optional().nullable(),
  status: campaignStatusSchema.optional(),
  messageTemplate: z.string().optional(),
  variables: z.array(z.string()).optional(),
  attachments: z.array(attachmentSchema).optional(),
  automation: campaignAutomationSchema.optional().nullable(),
  stats: z
    .object({
      sent: z.number().int().nonnegative().optional(),
      opened: z.number().int().nonnegative().optional(),
      clicked: z.number().int().nonnegative().optional(),
      converted: z.number().int().nonnegative().optional(),
    })
    .optional(),
})

export type CreateCampaignInput = z.input<typeof createCampaignSchema>
export type UpdateCampaignInput = z.input<typeof updateCampaignSchema>

export { campaignAudienceLabel }
