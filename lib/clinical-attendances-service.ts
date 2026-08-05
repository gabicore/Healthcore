import type {
  ClinicalAttendance,
  ClinicalAttendanceStatus,
  ServiceCategory,
} from '@/lib/clinic-types'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import type { Weekday } from '@/lib/data'
import {
  fromDbWeekday,
  parseIsoDate,
  toDbWeekday,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import { assertProfessionalSlotFree } from '@/lib/professional-schedule-conflict'
import { prisma } from '@/lib/prisma'
import type {
  CreateClinicalAttendanceInput,
  UpdateClinicalAttendanceInput,
} from '@/lib/validations/clinic'

function weekdayFromIsoDate(iso: string): Weekday {
  const jsDay = new Date(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  )
  const weekdayMap: Record<number, Weekday> = {
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
  }
  const weekday = weekdayMap[jsDay.getDay()]
  if (!weekday) throw new Error('Data inválida (domingo)')
  return weekday
}

function serializeAttendance(row: {
  id: string
  studentId: string
  serviceId: string
  professionalId: string
  date: Date
  weekday: Parameters<typeof fromDbWeekday>[0]
  time: string
  durationMinutes: number
  status: ClinicalAttendanceStatus
  notes: string | null
  student?: { name: string } | null
  service?: { name: string; category: ServiceCategory } | null
}): ClinicalAttendance {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student?.name,
    serviceId: row.serviceId,
    serviceName: row.service?.name,
    serviceCategory: row.service?.category,
    professionalId: row.professionalId,
    date: toIsoDateOnly(row.date),
    weekday: fromDbWeekday(row.weekday),
    time: row.time,
    durationMinutes: row.durationMinutes,
    status: row.status,
    notes: row.notes ?? undefined,
  }
}

const includeAttendance = {
  student: { select: { name: true } },
  service: { select: { name: true, category: true } },
} as const

export async function listClinicalAttendances(opts?: {
  fromDate?: string
  toDate?: string
  studentId?: string
  serviceId?: string
}) {
  const rows = await prisma.clinicalAttendance.findMany({
    where: {
      studioId: DEFAULT_STUDIO_ID,
      ...(opts?.studentId ? { studentId: opts.studentId } : {}),
      ...(opts?.serviceId ? { serviceId: opts.serviceId } : {}),
      ...(opts?.fromDate || opts?.toDate
        ? {
            date: {
              ...(opts.fromDate ? { gte: parseIsoDate(opts.fromDate) } : {}),
              ...(opts.toDate ? { lte: parseIsoDate(opts.toDate) } : {}),
            },
          }
        : {}),
    },
    include: includeAttendance,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  })
  return rows.map(serializeAttendance)
}

export async function getClinicalAttendanceById(id: string) {
  const row = await prisma.clinicalAttendance.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
    include: includeAttendance,
  })
  return row ? serializeAttendance(row) : null
}

export async function createClinicalAttendanceRecord(
  input: CreateClinicalAttendanceInput,
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, studioId: DEFAULT_STUDIO_ID },
  })
  if (!student) throw new Error('Pessoa não encontrada')

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, studioId: DEFAULT_STUDIO_ID, active: true },
  })
  if (!service) throw new Error('Serviço não encontrado')

  const professional = await prisma.professional.findFirst({
    where: { id: input.professionalId, studioId: DEFAULT_STUDIO_ID },
  })
  if (!professional) throw new Error('Profissional não encontrado')

  const weekday = weekdayFromIsoDate(input.date)
  await assertProfessionalSlotFree({
    professionalId: input.professionalId,
    dateIso: input.date,
    time: input.time,
  })

  const created = await prisma.clinicalAttendance.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      studentId: input.studentId,
      serviceId: input.serviceId,
      professionalId: input.professionalId,
      date: parseIsoDate(input.date),
      weekday: toDbWeekday(weekday),
      time: input.time,
      durationMinutes: input.durationMinutes ?? service.durationMinutes,
      status: input.status ?? 'agendada',
      notes: input.notes ?? null,
    },
    include: includeAttendance,
  })

  if (!student.usesClinic) {
    await prisma.student.update({
      where: { id: student.id },
      data: { usesClinic: true },
    })
  }

  return serializeAttendance(created)
}

export async function updateClinicalAttendanceRecord(
  id: string,
  input: UpdateClinicalAttendanceInput,
) {
  const existing = await prisma.clinicalAttendance.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
  })
  if (!existing) return null

  const nextDateIso = input.date ?? toIsoDateOnly(existing.date)
  const nextTime = input.time ?? existing.time
  const nextProfessionalId = input.professionalId ?? existing.professionalId
  const scheduleChanging =
    input.date !== undefined ||
    input.time !== undefined ||
    input.professionalId !== undefined

  if (scheduleChanging) {
    weekdayFromIsoDate(nextDateIso)
    await assertProfessionalSlotFree({
      professionalId: nextProfessionalId,
      dateIso: nextDateIso,
      time: nextTime,
      ignoreClinicalAttendanceId: existing.id,
    })
  }

  if (input.serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, studioId: DEFAULT_STUDIO_ID },
    })
    if (!service) throw new Error('Serviço não encontrado')
  }

  const updated = await prisma.clinicalAttendance.update({
    where: { id },
    data: {
      ...(input.studentId !== undefined ? { studentId: input.studentId } : {}),
      ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
      ...(input.professionalId !== undefined
        ? { professionalId: input.professionalId }
        : {}),
      ...(input.date !== undefined
        ? {
            date: parseIsoDate(input.date),
            weekday: toDbWeekday(weekdayFromIsoDate(input.date)),
          }
        : {}),
      ...(input.time !== undefined ? { time: input.time } : {}),
      ...(input.durationMinutes !== undefined
        ? { durationMinutes: input.durationMinutes }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: includeAttendance,
  })
  return serializeAttendance(updated)
}

export async function deleteClinicalAttendanceRecord(id: string) {
  const existing = await prisma.clinicalAttendance.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
    select: { id: true },
  })
  if (!existing) return null
  await prisma.clinicalAttendance.delete({ where: { id } })
  return { id }
}
