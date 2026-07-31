import type {
  AttendanceStatus,
  ClassSession,
  ClassSessionType,
  ScheduleSlot,
  Weekday,
} from '@/lib/data'
import {
  scheduleWithinPlanLimit,
  slotFitsStudioHour,
  toIsoDate,
} from '@/lib/data'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  fromDbWeekday,
  parseIsoDate,
  toDbWeekday,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'
import { serializeSchedule } from '@/lib/serializers/student'
import { listStudioHours, listTimeSlots } from '@/lib/settings-service'

export type CreateSessionInput = {
  date: string
  time: string
  type?: ClassSessionType
  status?: AttendanceStatus
  notes?: string
  professionalId?: string
  guestName?: string
}

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

function serializeSession(row: {
  id: string
  studentId: string | null
  guestName: string | null
  date: Date
  weekday: Parameters<typeof fromDbWeekday>[0]
  time: string
  status: AttendanceStatus
  type: ClassSessionType
  professionalId: string | null
  notes: string | null
}): ClassSession {
  return {
    id: row.id,
    studentId: row.studentId ?? '',
    guestName: row.guestName ?? undefined,
    date: toIsoDateOnly(row.date),
    weekday: fromDbWeekday(row.weekday),
    time: row.time,
    status: row.status,
    type: row.type,
    professionalId: row.professionalId ?? undefined,
    notes: row.notes ?? undefined,
  }
}

export async function listStudentSessions(
  studentId: string,
  opts?: {
    fromDate?: string
    toDate?: string
    types?: ClassSessionType[]
  },
) {
  const rows = await prisma.classSession.findMany({
    where: {
      studentId,
      ...(opts?.fromDate || opts?.toDate
        ? {
            date: {
              ...(opts.fromDate ? { gte: parseIsoDate(opts.fromDate) } : {}),
              ...(opts.toDate ? { lte: parseIsoDate(opts.toDate) } : {}),
            },
          }
        : {}),
      ...(opts?.types?.length ? { type: { in: opts.types } } : {}),
    },
    orderBy: [{ date: 'desc' }, { time: 'asc' }],
  })
  return rows.map(serializeSession)
}

export async function createStudentSessionRecord(
  studentId: string,
  input: CreateSessionInput,
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) throw new Error('Aluno não encontrado')

  const date = parseIsoDate(input.date)
  const weekday = weekdayFromIsoDate(input.date)

  const type = input.type ?? 'reposicao'
  const status = input.status ?? 'agendada'

  if (type === 'reposicao') {
    await assertMakeupAllowed(studentId)
    await assertMakeupPlacement({
      studentId,
      sessionIdToIgnore: null,
      dateIso: input.date,
      date,
      time: input.time,
      weekday,
    })
  }

  const created = await prisma.classSession.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      studentId,
      date,
      weekday: toDbWeekday(weekday),
      time: input.time,
      type,
      status,
      notes: input.notes ?? null,
      professionalId: input.professionalId ?? null,
      guestName: input.guestName ?? null,
    },
  })

  return serializeSession(created)
}

/** Vigência do contrato ativo que governa crédito de reposição. */
async function getActiveContractRange(studentId: string) {
  const active = await prisma.contract.findFirst({
    where: { studentId, status: 'ativo' },
    orderBy: { startDate: 'desc' },
    select: { startDate: true, endDate: true },
  })
  if (!active) return null
  return {
    fromDate: toIsoDateOnly(active.startDate),
    toDate: toIsoDateOnly(active.endDate),
  }
}

/** Saldo de reposições no contrato ativo: faltas/cancelamentos − reposições. */
export async function getMakeupAllowanceForStudent(studentId: string) {
  const range = await getActiveContractRange(studentId)
  const rows = await prisma.classSession.findMany({
    where: {
      studentId,
      ...(range
        ? {
            date: {
              gte: parseIsoDate(range.fromDate),
              lte: parseIsoDate(range.toDate),
            },
          }
        : {}),
    },
    select: { type: true, status: true, date: true },
  })
  const missed = rows.filter(
    (r) =>
      r.type === 'fixa' &&
      (r.status === 'falta' || r.status === 'cancelada'),
  ).length
  const used = rows.filter(
    (r) => r.type === 'reposicao' && r.status !== 'cancelada',
  ).length
  return {
    missed,
    used,
    remaining: Math.max(0, missed - used),
    range,
  }
}

async function assertMakeupAllowed(studentId: string) {
  const { remaining, missed, used, range } =
    await getMakeupAllowanceForStudent(studentId)
  if (!range) {
    throw new Error(
      'Reposição só é permitida com contrato ativo. Ative um contrato antes de remarcar.',
    )
  }
  if (remaining <= 0) {
    throw new Error(
      missed === 0
        ? 'Reposição só é permitida quando uma aula fixa tem falta ou foi cancelada'
        : `Limite de reposições do contrato atingido (${used}/${missed}). Só é possível repor aulas fixas com falta ou cancelamento.`,
    )
  }
}

async function assertMakeupPlacement(input: {
  studentId: string
  sessionIdToIgnore: string | null
  dateIso: string
  date: Date
  time: string
  weekday: Weekday
}) {
  const range = await getActiveContractRange(input.studentId)
  if (
    range &&
    (input.dateIso < range.fromDate || input.dateIso > range.toDate)
  ) {
    throw new Error(
      `A reposição deve ficar na vigência do contrato (${range.fromDate} a ${range.toDate})`,
    )
  }

  const fixedSlots = await prisma.scheduleSlot.findMany({
    where: { studentId: input.studentId },
    select: { weekday: true, time: true },
  })
  const conflictsFixed = fixedSlots.some(
    (slot) =>
      fromDbWeekday(slot.weekday) === input.weekday && slot.time === input.time,
  )
  if (conflictsFixed) {
    throw new Error(
      'Reposição não pode ser no mesmo dia e horário da agenda fixa do aluno',
    )
  }

  const fixedSameDay = await prisma.classSession.findFirst({
    where: {
      studentId: input.studentId,
      date: input.date,
      time: input.time,
      type: 'fixa',
      status: { not: 'cancelada' },
      ...(input.sessionIdToIgnore
        ? { id: { not: input.sessionIdToIgnore } }
        : {}),
    },
  })
  if (fixedSameDay) {
    throw new Error(
      'Reposição não pode substituir uma aula fixa no mesmo dia e horário',
    )
  }
}

/** Persiste status de aula fixa (para crédito de reposição sobreviver ao reload). */
export async function upsertFixedSessionAttendance(
  studentId: string,
  input: {
    date: string
    time: string
    weekday: Weekday
    status: AttendanceStatus
    notes?: string | null
  },
) {
  const date = parseIsoDate(input.date)
  const existing = await prisma.classSession.findFirst({
    where: {
      studentId,
      date,
      time: input.time,
      type: 'fixa',
    },
  })
  if (existing) {
    const updated = await prisma.classSession.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    })
    return serializeSession(updated)
  }

  const created = await prisma.classSession.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      studentId,
      date,
      weekday: toDbWeekday(input.weekday),
      time: input.time,
      type: 'fixa',
      status: input.status,
      notes: input.notes ?? null,
    },
  })
  return serializeSession(created)
}

export async function updateSessionRecord(
  id: string,
  input: {
    status?: AttendanceStatus
    notes?: string | null
    date?: string
    time?: string
  },
) {
  const existing = await prisma.classSession.findUnique({ where: { id } })
  if (!existing) return null

  const nextDateIso = input.date ?? toIsoDateOnly(existing.date)
  const nextDate = input.date ? parseIsoDate(input.date) : existing.date
  const nextTime = input.time ?? existing.time

  if (existing.type === 'reposicao' && (input.date !== undefined || input.time !== undefined)) {
    if (!existing.studentId) {
      throw new Error('Aula sem aluno vinculado')
    }
    const weekday = weekdayFromIsoDate(nextDateIso)
    await assertMakeupPlacement({
      studentId: existing.studentId,
      sessionIdToIgnore: existing.id,
      dateIso: nextDateIso,
      date: nextDate,
      time: nextTime,
      weekday,
    })
  }

  const updated = await prisma.classSession.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.date !== undefined ? { date: nextDate } : {}),
      ...(input.time !== undefined ? { time: nextTime } : {}),
      ...(input.date !== undefined
        ? { weekday: toDbWeekday(weekdayFromIsoDate(nextDateIso)) }
        : {}),
    },
  })
  return serializeSession(updated)
}

export type WeekAgendaStudent = {
  id: string
  name: string
  active: boolean
  planId: string
  schedule: ScheduleSlot[]
  weeklyLimit: number
  contractStart: string
  contractEnd: string
}

/**
 * Agenda da semana do estúdio: aulas fixas a partir de ScheduleSlot +
 * frequência do contrato ativo (igual ao perfil do aluno), mescladas com
 * ClassSession persistidas (reposições, avulsas, status de presença).
 */
export async function listWeekAgenda(fromDate: string, toDate: string) {
  const from = parseIsoDate(fromDate)
  const to = parseIsoDate(toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new Error('Intervalo de datas inválido')
  }

  const todayIso = toIsoDate(new Date())
  const [studioHours, timeSlots, students, persistedRows] = await Promise.all([
    listStudioHours(),
    listTimeSlots(),
    prisma.student.findMany({
      where: { studioId: DEFAULT_STUDIO_ID, active: true },
      include: {
        schedule: true,
        contracts: {
          where: { status: 'ativo' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.classSession.findMany({
      where: {
        studioId: DEFAULT_STUDIO_ID,
        date: { gte: from, lte: to },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    }),
  ])

  const hourByWeekday = new Map(studioHours.map((h) => [h.weekday, h]))
  const gradeTimes = timeSlots.map((s) => s.time)
  const planIds = [
    ...new Set(
      students
        .map((s) => s.contracts[0]?.planId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const plans = planIds.length
    ? await prisma.plan.findMany({ where: { id: { in: planIds } } })
    : []
  const frequencyByPlan = new Map(plans.map((p) => [p.id, p.frequency]))

  const agendaStudents: WeekAgendaStudent[] = []
  const generatedFixed: ClassSession[] = []

  for (const student of students) {
    const contract = student.contracts[0]
    // Sem contrato ativo a agenda fica vazia — mesma regra do perfil.
    if (!contract) continue

    const contractStart = toIsoDateOnly(contract.startDate)
    const contractEnd = toIsoDateOnly(contract.endDate)
    const weeklyLimit = frequencyByPlan.get(contract.planId) ?? 1
    const limited = scheduleWithinPlanLimit(
      serializeSchedule(student.schedule),
      weeklyLimit,
    )

    agendaStudents.push({
      id: student.id,
      name: student.name,
      active: student.active,
      planId: contract.planId,
      schedule: limited,
      weeklyLimit,
      contractStart,
      contractEnd,
    })

    if (limited.length === 0) continue

    const cursor = new Date(from.getTime())
    while (cursor <= to) {
      const iso = toIsoDateOnly(cursor)
      if (iso >= contractStart && iso <= contractEnd) {
        let weekday: Weekday
        try {
          weekday = weekdayFromIsoDate(iso)
        } catch {
          cursor.setDate(cursor.getDate() + 1)
          continue
        }
        const hour = hourByWeekday.get(weekday)
        for (const slot of limited) {
          if (slot.weekday !== weekday) continue
          if (gradeTimes.length > 0 && !gradeTimes.includes(slot.time)) continue
          if (!slotFitsStudioHour(hour, slot.time)) continue
          generatedFixed.push({
            id: `${student.id}-${iso}-${slot.time}`,
            studentId: student.id,
            date: iso,
            weekday,
            time: slot.time,
            status: iso > todayIso ? 'agendada' : 'presente',
            type: 'fixa',
          })
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  const persisted = persistedRows.map(serializeSession)
  const byFixedKey = new Map<string, ClassSession>()

  for (const session of generatedFixed) {
    byFixedKey.set(
      `${session.studentId}|${session.date}|${session.time}`,
      session,
    )
  }

  const manuals: ClassSession[] = []
  for (const record of persisted) {
    if (record.type === 'fixa' && record.studentId) {
      const key = `${record.studentId}|${record.date}|${record.time}`
      const base = byFixedKey.get(key)
      if (base) {
        byFixedKey.set(key, {
          ...base,
          id: record.id,
          status: record.status,
          notes: record.notes,
          professionalId: record.professionalId,
        })
      } else {
        // Fixa persistida fora da grade atual (ex.: horário removido) ainda aparece.
        byFixedKey.set(key, record)
      }
      continue
    }
    manuals.push(record)
  }

  const sessions = [...byFixedKey.values(), ...manuals].sort((a, b) =>
    `${a.date}${a.time}${a.studentId}`.localeCompare(
      `${b.date}${b.time}${b.studentId}`,
    ),
  )

  return { sessions, students: agendaStudents }
}
