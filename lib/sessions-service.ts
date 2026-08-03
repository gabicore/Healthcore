import type {
  AttendanceStatus,
  ClassSession,
  ClassSessionType,
  Weekday,
} from '@/lib/data'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  fromDbWeekday,
  parseIsoDate,
  toDbWeekday,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'

export type CreateSessionInput = {
  date: string
  time: string
  type?: ClassSessionType
  status?: AttendanceStatus
  notes?: string
  professionalId?: string
  guestName?: string
  /** Id da aula fixa coberta (reposição). */
  coversSessionId?: string
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
  coversSessionId?: string | null
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
    coversSessionId: row.coversSessionId ?? undefined,
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

  let coversSessionId: string | null = input.coversSessionId ?? null

  if (type === 'reposicao') {
    coversSessionId = await assertMakeupAllowed(studentId, coversSessionId)
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
      coversSessionId,
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

/** Saldo de reposições no contrato ativo (vínculo explícito + FIFO legado). */
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
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      coversSessionId: true,
    },
  })
  const missedRows = rows
    .filter(
      (r) =>
        r.type === 'fixa' &&
        (r.status === 'falta' || r.status === 'cancelada'),
    )
    .sort(
      (a, b) =>
        toIsoDateOnly(a.date).localeCompare(toIsoDateOnly(b.date)) ||
        a.id.localeCompare(b.id),
    )
  const usedRows = rows.filter(
    (r) => r.type === 'reposicao' && r.status !== 'cancelada',
  )
  const linkedCovered = new Set(
    usedRows
      .map((r) => r.coversSessionId)
      .filter((id): id is string => Boolean(id)),
  )
  const unlinkedUsed = usedRows.filter((r) => !r.coversSessionId).length
  const uncovered = missedRows.filter((r) => !linkedCovered.has(r.id))
  const remaining = Math.max(0, uncovered.length - unlinkedUsed)
  return {
    missed: missedRows.length,
    used: usedRows.length,
    remaining,
    range,
  }
}

async function assertMakeupAllowed(
  studentId: string,
  coversSessionId: string | null,
): Promise<string | null> {
  const { remaining, missed, used, range } =
    await getMakeupAllowanceForStudent(studentId)
  if (!range) {
    throw new Error(
      'Reposição só é permitida com contrato ativo. Ative um contrato antes de remarcar.',
    )
  }

  if (coversSessionId) {
    const covered = await prisma.classSession.findFirst({
      where: {
        id: coversSessionId,
        studentId,
        type: 'fixa',
        status: { in: ['falta', 'cancelada'] },
      },
    })
    if (!covered) {
      throw new Error(
        'Aula de origem inválida. Remarque a partir de uma falta ou cancelamento de aula fixa.',
      )
    }
    const already = await prisma.classSession.findFirst({
      where: {
        coversSessionId,
        type: 'reposicao',
        status: { not: 'cancelada' },
      },
    })
    if (already) {
      throw new Error('Esta falta/cancelamento já possui reposição marcada')
    }
    return coversSessionId
  }

  if (remaining <= 0) {
    throw new Error(
      missed === 0
        ? 'Reposição só é permitida quando uma aula fixa tem falta ou foi cancelada'
        : `Limite de reposições do contrato atingido (${used}/${missed}). Só é possível repor aulas fixas com falta ou cancelamento.`,
    )
  }
  return null
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

  const date = parseIsoDate(input.dateIso)
  const fixedSlots = await prisma.scheduleSlot.findMany({
    where: {
      studentId: input.studentId,
      validFrom: { lte: date },
      OR: [{ validTo: null }, { validTo: { gte: date } }],
    },
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
    coversSessionId?: string | null
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
      ...(input.coversSessionId !== undefined
        ? { coversSessionId: input.coversSessionId }
        : {}),
    },
  })
  return serializeSession(updated)
}
