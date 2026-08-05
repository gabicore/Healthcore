import type { ServiceCategory, StudioService } from '@/lib/clinic-types'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import { decimalToNumber } from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '@/lib/validations/clinic'

function serializeService(row: {
  id: string
  name: string
  category: ServiceCategory
  durationMinutes: number
  price: { toString(): string } | number
  professionalId: string | null
  requiresInitialAssessment: boolean
  requiresEvolution: boolean
  active: boolean
}): StudioService {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    durationMinutes: row.durationMinutes,
    price: decimalToNumber(row.price as never),
    professionalId: row.professionalId ?? undefined,
    requiresInitialAssessment: row.requiresInitialAssessment,
    requiresEvolution: row.requiresEvolution,
    active: row.active,
  }
}

export async function listServices(params?: { active?: boolean }) {
  const rows = await prisma.service.findMany({
    where: {
      studioId: DEFAULT_STUDIO_ID,
      ...(params?.active === true
        ? { active: true }
        : params?.active === false
          ? { active: false }
          : {}),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return rows.map(serializeService)
}

export async function getServiceById(id: string) {
  const row = await prisma.service.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
  })
  return row ? serializeService(row) : null
}

export async function createServiceRecord(input: CreateServiceInput) {
  const created = await prisma.service.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      name: input.name.trim(),
      category: input.category,
      durationMinutes: input.durationMinutes ?? 60,
      price: input.price ?? 0,
      professionalId: input.professionalId || null,
      requiresInitialAssessment: input.requiresInitialAssessment ?? false,
      requiresEvolution: input.requiresEvolution ?? false,
      active: input.active ?? true,
    },
  })
  return serializeService(created)
}

export async function updateServiceRecord(
  id: string,
  input: UpdateServiceInput,
) {
  const existing = await prisma.service.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
  })
  if (!existing) return null
  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.durationMinutes !== undefined
        ? { durationMinutes: input.durationMinutes }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.professionalId !== undefined
        ? { professionalId: input.professionalId || null }
        : {}),
      ...(input.requiresInitialAssessment !== undefined
        ? { requiresInitialAssessment: input.requiresInitialAssessment }
        : {}),
      ...(input.requiresEvolution !== undefined
        ? { requiresEvolution: input.requiresEvolution }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  })
  return serializeService(updated)
}

export async function deleteServiceRecord(id: string) {
  const existing = await prisma.service.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
    select: { id: true },
  })
  if (!existing) return null
  await prisma.service.delete({ where: { id } })
  return { id }
}
