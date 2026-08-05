import type {
  Evolution,
  EvolutionPhoto,
  Payment,
  PhysicalAssessment,
  ScheduleSlot,
  Student,
} from '@/lib/data'
import {
  decimalToNumber,
  fromDbPaymentMethod,
  fromDbWeekday,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import type {
  Evolution as DbEvolution,
  EvolutionPhoto as DbPhoto,
  Payment as DbPayment,
  PhysicalAssessment as DbAssessment,
  ScheduleSlot as DbSchedule,
  Student as DbStudent,
} from '@prisma/client'

type StudentWithRelations = DbStudent & {
  schedule?: DbSchedule[]
  payments?: DbPayment[]
  assessments?: DbAssessment[]
  evolutions?: DbEvolution[]
  photos?: DbPhoto[]
  contracts?: Array<{
    status: string
    planId: string
    planLabel: string
    startDate: Date
  }>
}

export function serializeSchedule(slots: DbSchedule[] = []): ScheduleSlot[] {
  return slots.map((slot) => ({
    weekday: fromDbWeekday(slot.weekday),
    time: slot.time,
    effectiveFrom: toIsoDateOnly(slot.effectiveFrom),
    effectiveTo: slot.effectiveTo ? toIsoDateOnly(slot.effectiveTo) : null,
  }))
}

export function serializePayments(payments: DbPayment[] = []): Payment[] {
  return payments.map((payment) => ({
    id: payment.id,
    reference: payment.reference,
    dueDate: toIsoDateOnly(payment.dueDate),
    amount: decimalToNumber(payment.amount),
    status: payment.status,
    method: payment.method
      ? fromDbPaymentMethod(payment.method)
      : undefined,
    paidAt: payment.paidAt ? toIsoDateOnly(payment.paidAt) : undefined,
  }))
}

export function serializeAssessments(
  assessments: DbAssessment[] = [],
): PhysicalAssessment[] {
  return assessments.map((assessment) => {
    // Registros antigos em metros (< 3) são lidos como cm.
    const height =
      assessment.height > 0 && assessment.height < 3
        ? Math.round(assessment.height * 1000) / 10
        : assessment.height

    return {
      id: assessment.id,
      date: toIsoDateOnly(assessment.date),
      weight: assessment.weight,
      height,
      bodyFat: assessment.bodyFat ?? undefined,
      muscleMass: assessment.muscleMass ?? undefined,
      measures: {
        armRight: assessment.armRight,
        armLeft: assessment.armLeft,
        chest: assessment.chest,
        waist: assessment.waist,
        abdomen: assessment.abdomen,
        hip: assessment.hip,
        thighRight: assessment.thighRight,
        thighLeft: assessment.thighLeft,
        calfRight: assessment.calfRight,
        calfLeft: assessment.calfLeft,
      },
    }
  })
}

export function serializeEvolutions(
  evolutions: DbEvolution[] = [],
): Evolution[] {
  return evolutions.map((evolution) => ({
    id: evolution.id,
    date: toIsoDateOnly(evolution.date),
    professional: evolution.professional,
    clinical: evolution.clinical,
    complaints: evolution.complaints,
    improvements: evolution.improvements,
    exercises: evolution.exercises,
    conduct: evolution.conduct,
  }))
}

export function serializePhotos(photos: DbPhoto[] = []): EvolutionPhoto[] {
  return photos.map((photo) => ({
    id: photo.id,
    date: toIsoDateOnly(photo.date),
    label: photo.label,
    url: photo.url,
  }))
}

export function serializeStudent(student: StudentWithRelations): Student {
  const activeContract =
    student.contracts?.find((c) => c.status === 'ativo') ?? null
  const hasActiveContract = Boolean(activeContract)

  return {
    id: student.id,
    name: student.name,
    birthDate: toIsoDateOnly(student.birthDate),
    sex: student.sex,
    cpf: student.cpf,
    phone: student.phone,
    email: student.email,
    cep: student.cep,
    street: student.street,
    addressNumber: student.addressNumber,
    neighborhood: student.neighborhood,
    city: student.city,
    state: student.state,
    address: student.address,
    emergencyName: student.emergencyName,
    emergencyRelation: student.emergencyRelation,
    emergencyPhone: student.emergencyPhone,
    emergencyContact: student.emergencyContact,
    active: hasActiveContract,
    hasActiveContract,
    activePlanLabel: activeContract?.planLabel || undefined,
    // Sempre alinhado ao início do contrato ativo, quando houver.
    since: activeContract
      ? toIsoDateOnly(activeContract.startDate)
      : toIsoDateOnly(student.since),
    objective: student.objective,
    pathologies: student.pathologies,
    injuries: student.injuries,
    surgeries: student.surgeries,
    restrictions: student.restrictions,
    medications: student.medications,
    notes: student.notes,
    planId: hasActiveContract
      ? (activeContract?.planId ?? student.planId)
      : '',
    monthlyValue: hasActiveContract
      ? decimalToNumber(student.monthlyValue)
      : 0,
    discountPercent: hasActiveContract ? student.discountPercent : 0,
    dueDay: student.dueDay,
    paymentMethod: fromDbPaymentMethod(student.paymentMethod),
    schedule: hasActiveContract ? serializeSchedule(student.schedule) : [],
    payments: hasActiveContract ? serializePayments(student.payments) : [],
    assessments: serializeAssessments(student.assessments),
    evolutions: serializeEvolutions(student.evolutions),
    photos: serializePhotos(student.photos),
  }
}

export const studentDetailInclude = {
  schedule: true,
  payments: { orderBy: { dueDate: 'desc' as const } },
  assessments: { orderBy: { date: 'desc' as const } },
  evolutions: { orderBy: { date: 'desc' as const } },
  photos: { orderBy: { date: 'desc' as const } },
  contracts: {
    where: { status: 'ativo' as const },
    orderBy: { startDate: 'desc' as const },
    take: 1,
    select: {
      status: true,
      planId: true,
      planLabel: true,
      startDate: true,
    },
  },
}
