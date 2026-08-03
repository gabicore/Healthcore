import { priceWithDiscount, slotFitsStudioHour, type Weekday } from '@/lib/data'
import {
  composeAddress,
  hasStructuredAddress,
  lookupCepServer,
  parseLegacyAddress,
} from '@/lib/cep'
import {
  composeEmergencyContact,
  parseEmergencyContact,
} from '@/lib/emergency-contact'
import {
  decimalToNumber,
  parseIsoDate,
  toDbPaymentMethod,
  toDbWeekday,
} from '@/lib/db-mappers'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  findGoverningContract,
  syncStudentFromActiveContract,
} from '@/lib/contracts-service'
import { maskCep, onlyDigits } from '@/lib/masks'
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
  // Agenda órfã (sem contrato ativo) não deve aparecer na grade.
  await prisma.scheduleSlot.deleteMany({
    where: {
      student: {
        studioId: DEFAULT_STUDIO_ID,
        contracts: { none: { status: 'ativo' } },
      },
    },
  })

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

/**
 * Alunos antigos têm só `address` (texto) ou CEP sem rua/bairro.
 * Preenche os campos estruturados uma vez ao abrir o perfil.
 */
async function hydrateStructuredAddress(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      cep: true,
      street: true,
      addressNumber: true,
      neighborhood: true,
      city: true,
      state: true,
      address: true,
    },
  })
  if (!student || hasStructuredAddress(student)) return

  const legacy = parseLegacyAddress(student.address)
  const fromCep = await lookupCepServer(student.cep)

  if (!fromCep && !legacy) return

  const street = fromCep?.street || legacy?.street || student.street
  const addressNumber =
    student.addressNumber || legacy?.addressNumber || ''
  const neighborhood =
    fromCep?.neighborhood || legacy?.neighborhood || student.neighborhood
  const city = fromCep?.city || legacy?.city || student.city
  const state = fromCep?.state || legacy?.state || student.state
  const cep =
    onlyDigits(student.cep).length === 8
      ? maskCep(student.cep)
      : student.cep

  if (!hasStructuredAddress({ street, city })) return

  const address =
    composeAddress({
      street,
      addressNumber,
      neighborhood,
      city,
      state,
    }) || student.address

  await prisma.student.update({
    where: { id: studentId },
    data: {
      cep,
      street,
      addressNumber,
      neighborhood,
      city,
      state,
      address,
    },
  })
}

/** Alunos antigos têm só o texto composto de emergência. */
async function hydrateEmergencyContact(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      emergencyName: true,
      emergencyRelation: true,
      emergencyPhone: true,
      emergencyContact: true,
    },
  })
  if (!student) return
  if (
    student.emergencyName.trim() ||
    student.emergencyRelation.trim() ||
    student.emergencyPhone.trim()
  ) {
    return
  }

  const parsed = parseEmergencyContact(student.emergencyContact)
  if (!parsed) return

  const emergencyContact =
    composeEmergencyContact(parsed) || student.emergencyContact

  await prisma.student.update({
    where: { id: studentId },
    data: {
      emergencyName: parsed.name,
      emergencyRelation: parsed.relation,
      emergencyPhone: parsed.phone,
      emergencyContact,
    },
  })
}

export async function getStudentById(id: string) {
  // Contrato ativo é a fonte da verdade para plano, cobrança e limite de agenda.
  await syncStudentFromActiveContract(id)
  await hydrateStructuredAddress(id)
  await hydrateEmergencyContact(id)

  const student = await prisma.student.findUnique({
    where: { id },
    include: studentDetailInclude,
  })
  return student ? serializeStudent(student) : null
}

export async function createStudentRecord(input: CreateStudentInput) {
  let planId = input.planId?.trim() || ''
  let plan = planId
    ? await prisma.plan.findUnique({ where: { id: planId } })
    : null

  if (!plan) {
    plan = await prisma.plan.findFirst({ orderBy: { name: 'asc' } })
    if (!plan) throw new Error('Nenhum plano cadastrado')
    planId = plan.id
  }

  // Agenda fixa só após contrato ativo — cadastro inicia sem horários.
  if ((input.schedule ?? []).length > 0) {
    throw new Error(
      'Defina a agenda fixa após assinar um contrato ativo do aluno',
    )
  }

  const discount = input.discountPercent ?? 0
  const monthlyValue =
    input.monthlyValue ?? priceWithDiscount(Number(plan.price), discount)

  const street = input.street ?? ''
  const addressNumber = input.addressNumber ?? ''
  const neighborhood = input.neighborhood ?? ''
  const city = input.city ?? ''
  const state = input.state ?? ''
  const address =
    input.address?.trim() ||
    composeAddress({ street, addressNumber, neighborhood, city, state })

  const emergencyName = input.emergencyName ?? ''
  const emergencyRelation = input.emergencyRelation ?? ''
  const emergencyPhone = input.emergencyPhone ?? ''
  const emergencyContact =
    input.emergencyContact?.trim() ||
    composeEmergencyContact({
      name: emergencyName,
      relation: emergencyRelation,
      phone: emergencyPhone,
    })

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
      street,
      addressNumber,
      neighborhood,
      city,
      state,
      address,
      emergencyName,
      emergencyRelation,
      emergencyPhone,
      emergencyContact,
      active: false,
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
      planId,
      monthlyValue,
      discountPercent: discount,
      dueDay: input.dueDay ?? 10,
      paymentMethod: toDbPaymentMethod(input.paymentMethod ?? 'PIX'),
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
    const governing = await findGoverningContract(id)
    if (!governing && input.schedule.length > 0) {
      throw new Error(
        'Assine um contrato ativo antes de definir a agenda fixa do aluno',
      )
    }
    await assertScheduleFitsStudioHours(input.schedule)
    await assertScheduleFitsPlanFrequency(id, input.schedule, planId)
    await prisma.scheduleSlot.deleteMany({ where: { studentId: id } })
  }

  const addressPartsTouched =
    input.street !== undefined ||
    input.addressNumber !== undefined ||
    input.neighborhood !== undefined ||
    input.city !== undefined ||
    input.state !== undefined

  const nextStreet = input.street ?? existing.street
  const nextNumber = input.addressNumber ?? existing.addressNumber
  const nextNeighborhood = input.neighborhood ?? existing.neighborhood
  const nextCity = input.city ?? existing.city
  const nextState = input.state ?? existing.state
  const composedAddress = composeAddress({
    street: nextStreet,
    addressNumber: nextNumber,
    neighborhood: nextNeighborhood,
    city: nextCity,
    state: nextState,
  })

  const emergencyPartsTouched =
    input.emergencyName !== undefined ||
    input.emergencyRelation !== undefined ||
    input.emergencyPhone !== undefined

  const nextEmergencyName = input.emergencyName ?? existing.emergencyName
  const nextEmergencyRelation =
    input.emergencyRelation ?? existing.emergencyRelation
  const nextEmergencyPhone = input.emergencyPhone ?? existing.emergencyPhone
  const composedEmergency = composeEmergencyContact({
    name: nextEmergencyName,
    relation: nextEmergencyRelation,
    phone: nextEmergencyPhone,
  })

  // "Aluno desde" segue o início do contrato ativo — não edita pelo cadastro.
  const sinceUpdate =
    input.since !== undefined && !(await findGoverningContract(id))
      ? { since: parseIsoDate(input.since) }
      : {}

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
      ...(input.street !== undefined ? { street: input.street } : {}),
      ...(input.addressNumber !== undefined
        ? { addressNumber: input.addressNumber }
        : {}),
      ...(input.neighborhood !== undefined
        ? { neighborhood: input.neighborhood }
        : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.address !== undefined
        ? { address: input.address }
        : addressPartsTouched
          ? { address: composedAddress }
          : {}),
      ...(input.emergencyName !== undefined
        ? { emergencyName: input.emergencyName }
        : {}),
      ...(input.emergencyRelation !== undefined
        ? { emergencyRelation: input.emergencyRelation }
        : {}),
      ...(input.emergencyPhone !== undefined
        ? { emergencyPhone: input.emergencyPhone }
        : {}),
      ...(input.emergencyContact !== undefined
        ? { emergencyContact: input.emergencyContact }
        : emergencyPartsTouched
          ? { emergencyContact: composedEmergency }
          : {}),
      ...sinceUpdate,
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

/** Remove o aluno e registros em cascata (agenda, pagamentos, contratos etc.). */
export async function deleteStudentRecord(id: string) {
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing) return null
  await prisma.student.delete({ where: { id } })
  return { id }
}
