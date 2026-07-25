import type {
  Campaign,
  CampaignAttachment,
  CampaignAutomation,
} from '@/lib/data'
import { campaignAudienceLabel } from '@/lib/data'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import { parseIsoDate, toIsoDateOnly } from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
} from '@/lib/validations/campaign'
import type { Campaign as DbCampaign, Prisma } from '@prisma/client'

function asAttachments(value: Prisma.JsonValue): CampaignAttachment[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const a = item as Record<string, unknown>
      if (
        typeof a.id !== 'string' ||
        typeof a.name !== 'string' ||
        (a.kind !== 'image' && a.kind !== 'pdf')
      ) {
        return null
      }
      return { id: a.id, name: a.name, kind: a.kind }
    })
    .filter((a): a is CampaignAttachment => a !== null)
}

function asVariables(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

export function serializeCampaign(row: DbCampaign): Campaign {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    channel: row.channel,
    audience: row.audience,
    audienceLabel: row.audienceLabel,
    startDate: toIsoDateOnly(row.startDate),
    endDate: row.endDate ? toIsoDateOnly(row.endDate) : undefined,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : undefined,
    status: row.status,
    messageTemplate: row.messageTemplate,
    variables: asVariables(row.variables),
    attachments: asAttachments(row.attachments),
    automation: (row.automation ?? null) as CampaignAutomation | null,
    stats: {
      sent: row.statsSent,
      opened: row.statsOpened,
      clicked: row.statsClicked,
      converted: row.statsConverted,
    },
    createdAt: toIsoDateOnly(row.createdAt),
    updatedAt: toIsoDateOnly(row.updatedAt),
  }
}

export async function listCampaigns() {
  const rows = await prisma.campaign.findMany({
    where: { studioId: DEFAULT_STUDIO_ID },
    orderBy: { updatedAt: 'desc' },
  })
  return rows.map(serializeCampaign)
}

export async function getCampaignById(id: string) {
  const row = await prisma.campaign.findUnique({ where: { id } })
  return row ? serializeCampaign(row) : null
}

export async function createCampaignRecord(input: CreateCampaignInput) {
  const audience = input.audience ?? 'ativos'
  const created = await prisma.campaign.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      name: input.name.trim(),
      type: input.type ?? 'marketing',
      channel: input.channel ?? 'whatsapp',
      audience,
      audienceLabel:
        input.audienceLabel ?? campaignAudienceLabel[audience],
      startDate: parseIsoDate(
        input.startDate ?? new Date().toISOString().slice(0, 10),
      ),
      endDate: input.endDate ? parseIsoDate(input.endDate) : null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      status: input.status ?? 'rascunho',
      messageTemplate: input.messageTemplate ?? '',
      variables: (input.variables ?? []) as Prisma.InputJsonValue,
      attachments: (input.attachments ?? []) as Prisma.InputJsonValue,
      automation: input.automation ?? null,
    },
  })
  return serializeCampaign(created)
}

export async function updateCampaignRecord(
  id: string,
  input: UpdateCampaignInput,
) {
  const existing = await prisma.campaign.findUnique({ where: { id } })
  if (!existing) return null

  const audience = input.audience ?? existing.audience

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.channel !== undefined ? { channel: input.channel } : {}),
      ...(input.audience !== undefined ? { audience: input.audience } : {}),
      audienceLabel:
        input.audienceLabel ??
        (input.audience
          ? campaignAudienceLabel[audience]
          : existing.audienceLabel),
      ...(input.startDate !== undefined
        ? { startDate: parseIsoDate(input.startDate) }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? parseIsoDate(input.endDate) : null }
        : {}),
      ...(input.scheduledAt !== undefined
        ? {
            scheduledAt: input.scheduledAt
              ? new Date(input.scheduledAt)
              : null,
          }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.messageTemplate !== undefined
        ? { messageTemplate: input.messageTemplate }
        : {}),
      ...(input.variables !== undefined
        ? { variables: input.variables as Prisma.InputJsonValue }
        : {}),
      ...(input.attachments !== undefined
        ? { attachments: input.attachments as Prisma.InputJsonValue }
        : {}),
      ...(input.automation !== undefined
        ? { automation: input.automation }
        : {}),
      ...(input.stats?.sent !== undefined
        ? { statsSent: input.stats.sent }
        : {}),
      ...(input.stats?.opened !== undefined
        ? { statsOpened: input.stats.opened }
        : {}),
      ...(input.stats?.clicked !== undefined
        ? { statsClicked: input.stats.clicked }
        : {}),
      ...(input.stats?.converted !== undefined
        ? { statsConverted: input.stats.converted }
        : {}),
    },
  })
  return serializeCampaign(updated)
}

export async function duplicateCampaignRecord(id: string) {
  const current = await getCampaignById(id)
  if (!current) return null
  return createCampaignRecord({
    name: `${current.name} (cópia)`,
    type: current.type,
    channel: current.channel,
    audience: current.audience,
    audienceLabel: current.audienceLabel,
    startDate: new Date().toISOString().slice(0, 10),
    status: 'rascunho',
    messageTemplate: current.messageTemplate,
    variables: [...current.variables],
    attachments: current.attachments.map((a) => ({
      ...a,
      id: `att-${Date.now()}-${a.id}`,
    })),
    automation: current.automation ?? null,
  })
}

export async function deleteCampaignRecord(id: string) {
  const existing = await prisma.campaign.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.campaign.delete({ where: { id } })
  return true
}
