import type {
  Plan,
  Professional,
  StudioHour,
  StudioProfile,
} from '@/lib/data'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  decimalToNumber,
  fromDbWeekday,
  toDbWeekday,
} from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'
import type {
  CreatePlanInput,
  CreateProfessionalInput,
  CreateTimeSlotInput,
  TimeSlotDto,
  UpdatePlanInput,
  UpdateProfessionalInput,
  UpdateStudioHourInput,
  UpdateStudioInput,
  UpdateTimeSlotInput,
} from '@/lib/validations/settings'

import type {
  Plan as DbPlan,
  Professional as DbProfessional,
  Studio as DbStudio,
  StudioHour as DbStudioHour,
  TimeSlot as DbTimeSlot,
} from '@prisma/client'

export type { TimeSlotDto }

export function serializePlan(row: DbPlan): Plan {
  return {
    id: row.id,
    name: row.name,
    period: row.period,
    frequency: row.frequency as Plan['frequency'],
    frequencyLabel: row.frequencyLabel,
    price: decimalToNumber(row.price),
  }
}

export function serializeProfessional(row: DbProfessional): Professional {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    registration: row.registration,
    email: row.email,
  }
}

export function serializeStudio(row: DbStudio): StudioProfile {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    email: row.email,
    phone: row.phone,
    cnpj: row.cnpj,
    address: row.address,
    plan: row.plan,
  }
}

export function serializeStudioHour(row: DbStudioHour): StudioHour {
  return {
    weekday: fromDbWeekday(row.weekday),
    open: row.open,
    close: row.close,
    closed: row.closed,
  }
}

export function serializeTimeSlot(row: DbTimeSlot): TimeSlotDto {
  return {
    id: row.id,
    time: row.time,
    period: row.period,
    capacity: row.capacity,
  }
}

function frequencyLabel(frequency: number, period: string) {
  const freq = `${frequency}x/semana`
  if (period === 'mensal') return freq
  if (period === 'trimestral') return `${freq} · trimestral`
  return `${freq} · semestral`
}

export async function listPlans() {
  const rows = await prisma.plan.findMany({
    where: { studioId: DEFAULT_STUDIO_ID },
    orderBy: { name: 'asc' },
  })
  return rows.map(serializePlan)
}

export async function getPlanById(id: string) {
  const row = await prisma.plan.findUnique({ where: { id } })
  return row ? serializePlan(row) : null
}

export async function createPlanRecord(input: CreatePlanInput) {
  const period = input.period ?? 'mensal'
  const frequency = input.frequency ?? 1
  const created = await prisma.plan.create({
    data: {
      id: input.id ?? `plan-${Date.now()}`,
      studioId: DEFAULT_STUDIO_ID,
      name: (input.name ?? 'Novo plano').trim() || 'Novo plano',
      period,
      frequency,
      frequencyLabel:
        input.frequencyLabel ?? frequencyLabel(frequency, period),
      price: input.price ?? 0,
    },
  })
  return serializePlan(created)
}

export async function updatePlanRecord(id: string, input: UpdatePlanInput) {
  const existing = await prisma.plan.findUnique({ where: { id } })
  if (!existing) return null

  const period = input.period ?? existing.period
  const frequency = input.frequency ?? existing.frequency

  const updated = await prisma.plan.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.period !== undefined ? { period: input.period } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      frequencyLabel:
        input.frequencyLabel ??
        (input.period !== undefined || input.frequency !== undefined
          ? frequencyLabel(frequency, period)
          : existing.frequencyLabel),
      ...(input.price !== undefined ? { price: input.price } : {}),
    },
  })
  return serializePlan(updated)
}

export async function deletePlanRecord(id: string) {
  const existing = await prisma.plan.findUnique({ where: { id } })
  if (!existing) return false
  const inUse = await prisma.student.count({ where: { planId: id } })
  if (inUse > 0) throw new Error('Plano em uso por alunos')
  const inContracts = await prisma.contract.count({ where: { planId: id } })
  if (inContracts > 0) throw new Error('Plano em uso por contratos')
  await prisma.plan.delete({ where: { id } })
  return true
}

export async function listProfessionals() {
  const rows = await prisma.professional.findMany({
    where: { studioId: DEFAULT_STUDIO_ID },
    orderBy: { name: 'asc' },
  })
  return rows.map(serializeProfessional)
}

export async function createProfessionalRecord(
  input: CreateProfessionalInput,
) {
  const created = await prisma.professional.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      name: (input.name ?? 'Novo profissional').trim() || 'Novo profissional',
      role: input.role ?? 'Instrutor',
      registration: input.registration ?? '',
      email: input.email ?? '',
    },
  })
  return serializeProfessional(created)
}

export async function updateProfessionalRecord(
  id: string,
  input: UpdateProfessionalInput,
) {
  const existing = await prisma.professional.findUnique({ where: { id } })
  if (!existing) return null
  const updated = await prisma.professional.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.registration !== undefined
        ? { registration: input.registration }
        : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
    },
  })
  return serializeProfessional(updated)
}

export async function deleteProfessionalRecord(id: string) {
  const count = await prisma.professional.count({
    where: { studioId: DEFAULT_STUDIO_ID },
  })
  if (count <= 1) throw new Error('É necessário manter ao menos um profissional')
  const existing = await prisma.professional.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.professional.delete({ where: { id } })
  return true
}

export async function getStudio() {
  const row = await prisma.studio.findUnique({
    where: { id: DEFAULT_STUDIO_ID },
  })
  return row ? serializeStudio(row) : null
}

export async function updateStudioRecord(input: UpdateStudioInput) {
  const existing = await prisma.studio.findUnique({
    where: { id: DEFAULT_STUDIO_ID },
  })
  if (!existing) return null
  const updated = await prisma.studio.update({
    where: { id: DEFAULT_STUDIO_ID },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.owner !== undefined ? { owner: input.owner.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.cnpj !== undefined ? { cnpj: input.cnpj.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() } : {}),
      ...(input.plan !== undefined ? { plan: input.plan } : {}),
    },
  })
  return serializeStudio(updated)
}

export async function listStudioHours() {
  const rows = await prisma.studioHour.findMany({
    where: { studioId: DEFAULT_STUDIO_ID },
  })
  const order = [
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ] as const
  return rows
    .map(serializeStudioHour)
    .sort((a, b) => order.indexOf(a.weekday) - order.indexOf(b.weekday))
}

export async function updateStudioHourRecord(input: UpdateStudioHourInput) {
  const weekday = toDbWeekday(input.weekday)
  const existing = await prisma.studioHour.findUnique({
    where: {
      studioId_weekday: { studioId: DEFAULT_STUDIO_ID, weekday },
    },
  })
  if (!existing) return null
  const updated = await prisma.studioHour.update({
    where: { id: existing.id },
    data: {
      ...(input.open !== undefined ? { open: input.open } : {}),
      ...(input.close !== undefined ? { close: input.close } : {}),
      ...(input.closed !== undefined ? { closed: input.closed } : {}),
    },
  })
  return serializeStudioHour(updated)
}

export async function listTimeSlots() {
  const rows = await prisma.timeSlot.findMany({
    where: { studioId: DEFAULT_STUDIO_ID },
    orderBy: { time: 'asc' },
  })
  return rows.map(serializeTimeSlot)
}

export async function createTimeSlotRecord(input: CreateTimeSlotInput) {
  const created = await prisma.timeSlot.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      time: input.time,
      period: input.period,
      capacity: input.capacity ?? 4,
    },
  })
  return serializeTimeSlot(created)
}

export async function updateTimeSlotRecord(
  id: string,
  input: UpdateTimeSlotInput,
) {
  const existing = await prisma.timeSlot.findUnique({ where: { id } })
  if (!existing) return null

  if (input.time && input.time !== existing.time) {
    await prisma.scheduleSlot.updateMany({
      where: { time: existing.time, student: { studioId: DEFAULT_STUDIO_ID } },
      data: { time: input.time },
    })
  }

  const updated = await prisma.timeSlot.update({
    where: { id },
    data: {
      ...(input.time !== undefined ? { time: input.time } : {}),
      ...(input.period !== undefined ? { period: input.period } : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
    },
  })
  return serializeTimeSlot(updated)
}

export async function deleteTimeSlotRecord(id: string) {
  const existing = await prisma.timeSlot.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.timeSlot.delete({ where: { id } })
  return true
}
