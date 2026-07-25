import { priceWithDiscount } from '@/lib/data'
import {
  decimalToNumber,
  parseIsoDate,
  toDbPaymentMethod,
  toDbWeekday,
} from '@/lib/db-mappers'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import {
  serializeStudent,
  studentDetailInclude,
} from '@/lib/serializers/student'
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from '@/lib/validations/student'

export async function listStudents(params?: {
  q?: string
  active?: boolean
}) {
  const students = await prisma.student.findMany({
    where: {
      studioId: DEFAULT_STUDIO_ID,
      ...(params?.active === true
        ? { active: true }
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
  return students.map(serializeStudent)
}

export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: studentDetailInclude,
  })
  return student ? serializeStudent(student) : null
}

export async function createStudentRecord(input: CreateStudentInput) {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
  if (!plan) throw new Error('Plano não encontrado')

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
      address: input.address ?? '',
      emergencyContact: input.emergencyContact ?? '',
      active: input.active ?? true,
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
    await prisma.scheduleSlot.deleteMany({ where: { studentId: id } })
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
