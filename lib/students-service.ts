import { priceWithDiscount, slotFitsStudioHour, type Weekday } from '@/lib/data'
import {
  decimalToNumber,
  parseIsoDate,
  toDbPaymentMethod,
  toDbWeekday,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  findGoverningContract,
  syncStudentFromActiveContract,
} from '@/lib/contracts-service'
import { prisma } from '@/lib/prisma'
import {
  serializeStudent,
  studentDetailInclude,
} from '@/lib/serializers/student'
import { listStudioHours } from '@/lib/settings-service'
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from '@/lib/validations/student'

async function assertScheduleFitsStudioHours(
  schedule: { weekday: Weekday; time: string }[],
) {
  if (schedule.length === 0) return
  const hours = await listStudioHours()
  for (const slot of schedule) {
    const hour = hours.find((h) => h.weekday === slot.weekday)
    if (!slotFitsStudioHour(hour, slot.time)) {
      throw new Error(
        `Estúdio fechado em ${slot.weekday} às ${slot.time}`,
      )
    }
  }
}

/** Limite semanal da agenda fixa: plano do contrato ativo (assinado), senão o do cadastro. */
export async function resolveStudentScheduleLimit(
  studentId: string,
  fallbackPlanId: string,
) {
  const governing = await findGoverningContract(studentId)
  const planId = governing?.planId ?? fallbackPlanId
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  return {
    planId,
    limit: plan?.frequency ?? 1,
    fromActiveContract: Boolean(governing),
  }
}

async function assertScheduleFitsPlanFrequency(
  studentId: string,
  schedule: { weekday: Weekday; time: string }[],
  fallbackPlanId: string,
) {
  if (schedule.length === 0) return
  const { limit, fromActiveContract } = await resolveStudentScheduleLimit(
    studentId,
    fallbackPlanId,
  )
  if (schedule.length > limit) {
    throw new Error(
      fromActiveContract
        ? `O plano do contrato ativo permite no máximo ${limit} aula(s) fixa(s) por semana`
        : `O plano permite no máximo ${limit} aula(s) fixa(s) por semana`,
    )
  }
}

export async function listStudents(params?: {
  q?: string
  active?: boolean
}) {
  const students = await prisma.student.findMany({
    where: {
      studioId: DEFAULT_STUDIO_ID,
      ...(params?.active === true
        ? {
            active: true,
            contracts: { some: { status: 'ativo' } },
          }
        : params?.active === false
          ? { active: false }
          : {}),
      ...(params?.q
        ? {
            OR: [
              { name: { contains: params.q } },
              { email: { contains: params.q } },
              { phone: { contains: params.q } },
              { cpf: { contains: params.q } },
            ],
          }
        : {}),
    },
    include: studentDetailInclude,
    orderBy: { name: 'asc' },
  })

  const activeContracts = students.length
    ? await prisma.contract.findMany({
        where: {
          status: 'ativo',
          studentId: { in: students.map((s) => s.id) },
        },
        orderBy: { startDate: 'desc' },
        select: { studentId: true, startDate: true, endDate: true },
      })
    : []

  const contractByStudent = new Map<
    string,
    { startDate: string; endDate: string }
  >()
  for (const contract of activeContracts) {
    if (contractByStudent.has(contract.studentId)) continue
    contractByStudent.set(contract.studentId, {
      startDate: toIsoDateOnly(contract.startDate),
      endDate: toIsoDateOnly(contract.endDate),
    })
  }

  return students.map((student) => {
    const serialized = serializeStudent(student)
    return {
      ...serialized,
      activeContract: contractByStudent.get(student.id) ?? null,
    }
  })
}

export async function getStudentById(id: string) {
  // Contrato ativo é a fonte da verdade para plano, cobrança e limite de agenda.
  await syncStudentFromActiveContract(id)

  const student = await prisma.student.findUnique({
    where: { id },
    include: studentDetailInclude,
  })
  if (!student) return null

  const governing = await findGoverningContract(id)
  const serialized = serializeStudent(student)
  return {
    ...serialized,
    activeContract: governing
      ? {
          startDate: toIsoDateOnly(governing.startDate),
          endDate: toIsoDateOnly(governing.endDate),
        }
      : null,
  }
}

export async function createStudentRecord(input: CreateStudentInput) {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
  if (!plan) throw new Error('Plano não encontrado')

  await assertScheduleFitsStudioHours(input.schedule ?? [])
  if ((input.schedule ?? []).length > plan.frequency) {
    throw new Error(
      `O plano permite no máximo ${plan.frequency} aula(s) fixa(s) por semana`,
    )
  }

  const discount = input.discountPercent ?? 0
  const monthlyValue =
    input.monthlyValue ?? priceWithDiscount(Number(plan.price), discount)

  const created = await prisma.student.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      name: input.name.trim(),
      birthDate: parseIsoDate(input.birthDate),
      sex: input.sex ?? 'Feminino',
      cpf: input.cpf ?? '',
      phone: input.phone ?? '',
      email: input.email ?? '',
      cep: input.cep ?? '',
      address: input.address ?? '',
      emergencyContact: input.emergencyContact ?? '',
      active: input.active ?? false,
      since: parseIsoDate(
        input.since ?? new Date().toISOString().slice(0, 10),
      ),
      objective: input.objective ?? '',
      pathologies: input.pathologies ?? '',
      injuries: input.injuries ?? '',
      surgeries: input.surgeries ?? '',
      restrictions: input.restrictions ?? '',
      medications: input.medications ?? '',
      notes: input.notes ?? '',
      planId: input.planId,
      monthlyValue,
      discountPercent: discount,
      dueDay: input.dueDay ?? 10,
      paymentMethod: toDbPaymentMethod(input.paymentMethod ?? 'PIX'),
      schedule: {
        create: (input.schedule ?? []).map((slot) => ({
          weekday: toDbWeekday(slot.weekday),
          time: slot.time,
        })),
      },
    },
    include: studentDetailInclude,
  })

  return serializeStudent(created)
}

export async function updateStudentRecord(
  id: string,
  input: UpdateStudentInput,
) {
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing) return null

  const governingContract = await findGoverningContract(id)

  // Com contrato ativo (assinado), plano e cobrança só mudam pelo contrato.
  if (governingContract) {
    const locked =
      input.planId !== undefined ||
      input.monthlyValue !== undefined ||
      input.discountPercent !== undefined ||
      input.dueDay !== undefined ||
      input.paymentMethod !== undefined
    if (locked) {
      throw new Error(
        'Com contrato ativo, altere plano e cobrança pelo contrato do aluno',
      )
    }
  }

  let monthlyValue = decimalToNumber(existing.monthlyValue)
  let planId = existing.planId
  let discountPercent = existing.discountPercent

  if (input.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
    if (!plan) throw new Error('Plano não encontrado')
    planId = plan.id
    if (input.monthlyValue === undefined) {
      const discount = input.discountPercent ?? discountPercent
      monthlyValue = priceWithDiscount(Number(plan.price), discount)
    }
  }

  if (input.discountPercent !== undefined) {
    discountPercent = input.discountPercent
    if (input.monthlyValue === undefined && input.planId === undefined) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } })
      if (plan) {
        monthlyValue = priceWithDiscount(Number(plan.price), discountPercent)
      }
    }
  }

  if (input.monthlyValue !== undefined) {
    monthlyValue = input.monthlyValue
  }

  if (input.schedule !== undefined) {
    await assertScheduleFitsStudioHours(input.schedule)
    await assertScheduleFitsPlanFrequency(id, input.schedule, planId)
    await prisma.scheduleSlot.deleteMany({ where: { studentId: id } })
  }

  if (input.active === true) {
    const canActivate = governingContract ?? (await findGoverningContract(id))
    if (!canActivate) {
      throw new Error(
        'Aluno só pode ficar ativo com contrato assinado válido',
      )
    }
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.birthDate !== undefined
        ? { birthDate: parseIsoDate(input.birthDate) }
        : {}),
      ...(input.sex !== undefined ? { sex: input.sex } : {}),
      ...(input.cpf !== undefined ? { cpf: input.cpf } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.cep !== undefined ? { cep: input.cep } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.emergencyContact !== undefined
        ? { emergencyContact: input.emergencyContact }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.since !== undefined
        ? { since: parseIsoDate(input.since) }
        : {}),
      ...(input.objective !== undefined ? { objective: input.objective } : {}),
      ...(input.pathologies !== undefined
        ? { pathologies: input.pathologies }
        : {}),
      ...(input.injuries !== undefined ? { injuries: input.injuries } : {}),
      ...(input.surgeries !== undefined ? { surgeries: input.surgeries } : {}),
      ...(input.restrictions !== undefined
        ? { restrictions: input.restrictions }
        : {}),
      ...(input.medications !== undefined
        ? { medications: input.medications }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      planId,
      monthlyValue,
      discountPercent,
      ...(input.dueDay !== undefined ? { dueDay: input.dueDay } : {}),
      ...(input.paymentMethod !== undefined
        ? { paymentMethod: toDbPaymentMethod(input.paymentMethod) }
        : {}),
      ...(input.schedule !== undefined
        ? {
            schedule: {
              create: input.schedule.map((slot) => ({
                weekday: toDbWeekday(slot.weekday),
                time: slot.time,
              })),
            },
          }
        : {}),
    },
    include: studentDetailInclude,
  })

  return serializeStudent(updated)
}

export async function deactivateStudentRecord(id: string) {
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing) return null
  const updated = await prisma.student.update({
    where: { id },
    data: { active: false },
    include: studentDetailInclude,
  })
  return serializeStudent(updated)
}
