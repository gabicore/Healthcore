import 'dotenv/config'
import { PrismaClient, type Prisma } from '@prisma/client'
import {
  addDays,
  afternoonSlots,
  campaigns,
  contracts,
  expenses,
  getMonday,
  morningSlots,
  plans,
  professionals,
  SLOT_CAPACITY,
  students,
  studio,
  studioHours,
  toIsoDate,
  weekdays,
  type Weekday,
} from '../lib/data'
import {
  parseIsoDate,
  toDbPaymentMethod,
  toDbWeekday,
} from '../lib/db-mappers'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding HealthCore...')

  await prisma.classSession.deleteMany()
  await prisma.clinicalAttendance.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.evolutionPhoto.deleteMany()
  await prisma.evolution.deleteMany()
  await prisma.physicalAssessment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.scheduleSlot.deleteMany()
  await prisma.authAuditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verification.deleteMany()
  await prisma.user.deleteMany()
  await prisma.student.deleteMany()
  await prisma.inventoryProduct.deleteMany()
  await prisma.service.deleteMany()
  await prisma.timeSlot.deleteMany()
  await prisma.studioHour.deleteMany()
  await prisma.professional.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.studio.deleteMany()

  const studioRow = await prisma.studio.create({
    data: {
      id: studio.id,
      name: studio.name,
      owner: studio.owner,
      email: studio.email,
      phone: studio.phone,
      cnpj: studio.cnpj,
      address: studio.address,
      plan: studio.plan,
    },
  })

  for (const plan of plans) {
    await prisma.plan.create({
      data: {
        id: plan.id,
        studioId: studioRow.id,
        name: plan.name,
        period: plan.period,
        frequency: plan.frequency,
        frequencyLabel: plan.frequencyLabel,
        price: plan.price,
      },
    })
  }

  for (const professional of professionals) {
    await prisma.professional.create({
      data: {
        id: professional.id,
        studioId: studioRow.id,
        name: professional.name,
        role: professional.role,
        registration: professional.registration,
        email: professional.email,
      },
    })
  }

  const clinicalServices = [
    {
      id: 'svc-fisioterapia',
      name: 'Fisioterapia',
      category: 'fisioterapia' as const,
      durationMinutes: 60,
      requiresInitialAssessment: true,
      requiresEvolution: true,
    },
    {
      id: 'svc-massoterapia',
      name: 'Massoterapia',
      category: 'massoterapia' as const,
      durationMinutes: 60,
      requiresInitialAssessment: false,
      requiresEvolution: false,
    },
    {
      id: 'svc-auriculoterapia',
      name: 'Auriculoterapia',
      category: 'auriculoterapia' as const,
      durationMinutes: 45,
      requiresInitialAssessment: false,
      requiresEvolution: true,
    },
    {
      id: 'svc-avaliacao',
      name: 'Avaliação',
      category: 'avaliacao' as const,
      durationMinutes: 60,
      requiresInitialAssessment: false,
      requiresEvolution: false,
    },
    {
      id: 'svc-experimental',
      name: 'Sessão experimental',
      category: 'experimental' as const,
      durationMinutes: 50,
      requiresInitialAssessment: false,
      requiresEvolution: false,
    },
  ]

  for (const service of clinicalServices) {
    await prisma.service.create({
      data: {
        id: service.id,
        studioId: studioRow.id,
        name: service.name,
        category: service.category,
        durationMinutes: service.durationMinutes,
        price: 0,
        requiresInitialAssessment: service.requiresInitialAssessment,
        requiresEvolution: service.requiresEvolution,
        active: true,
        professionalId: service.category === 'fisioterapia' ? 'prof1' : null,
      },
    })
  }

  for (const hour of studioHours) {
    await prisma.studioHour.create({
      data: {
        studioId: studioRow.id,
        weekday: toDbWeekday(hour.weekday),
        open: hour.open,
        close: hour.close,
        closed: hour.closed,
      },
    })
  }

  for (const time of morningSlots) {
    await prisma.timeSlot.create({
      data: {
        studioId: studioRow.id,
        period: 'manha',
        time,
        capacity: SLOT_CAPACITY,
      },
    })
  }
  for (const time of afternoonSlots) {
    await prisma.timeSlot.create({
      data: {
        studioId: studioRow.id,
        period: 'tarde',
        time,
        capacity: SLOT_CAPACITY,
      },
    })
  }

  for (const student of students) {
    await prisma.student.create({
      data: {
        id: student.id,
        studioId: studioRow.id,
        name: student.name,
        birthDate: parseIsoDate(student.birthDate),
        sex: student.sex,
        cpf: student.cpf,
        phone: student.phone,
        email: student.email,
        profession: student.profession ?? '',
        convenio: student.convenio ?? false,
        convenioCarteirinha: student.convenio
          ? (student.convenioCarteirinha ?? '')
          : '',
        convenioProduto: student.convenio
          ? (student.convenioProduto ?? '')
          : '',
        cep: student.cep,
        street: student.street ?? '',
        addressNumber: student.addressNumber ?? '',
        neighborhood: student.neighborhood ?? '',
        city: student.city ?? '',
        state: student.state ?? '',
        address: student.address,
        emergencyName: student.emergencyName ?? '',
        emergencyRelation: student.emergencyRelation ?? '',
        emergencyPhone: student.emergencyPhone ?? '',
        emergencyContact: student.emergencyContact,
        active: student.active,
        since: parseIsoDate(student.since),
        objective: student.objective,
        pathologies: student.pathologies,
        injuries: student.injuries,
        surgeries: student.surgeries,
        restrictions: student.restrictions,
        medications: student.medications,
        allergies: student.allergies ?? '',
        implants: student.implants ?? '',
        clinicalAlerts: student.clinicalAlerts ?? [],
        physicalActivity: student.physicalActivity ?? '',
        smoking: student.smoking ?? '',
        alcoholUse: student.alcoholUse ?? '',
        hydration: student.hydration ?? '',
        workPosture: student.workPosture ?? '',
        workHours: student.workHours ?? '',
        sleepHours: student.sleepHours ?? '',
        sleepQuality: student.sleepQuality ?? '',
        insomnia: student.insomnia ?? '',
        previousTreatments: student.previousTreatments ?? '',
        previousTreatmentFrequency: student.previousTreatmentFrequency ?? '',
        treatmentResults: student.treatmentResults ?? '',
        treatmentInterruptions: student.treatmentInterruptions ?? '',
        treatmentResponse: student.treatmentResponse ?? '',
        dischargeReason: student.dischargeReason ?? '',
        exams: student.exams ?? '',
        medicalReports: student.medicalReports ?? '',
        mriExams: student.mriExams ?? '',
        xrayExams: student.xrayExams ?? '',
        notes: student.notes,
        usesPilates: student.usesPilates !== false,
        usesClinic: Boolean(student.usesClinic),
        planId: student.planId,
        monthlyValue: student.monthlyValue,
        discountPercent: student.discountPercent ?? 0,
        dueDay: student.dueDay,
        paymentMethod: toDbPaymentMethod(student.paymentMethod),
        schedule: {
          create: student.schedule.map((slot) => ({
            weekday: toDbWeekday(slot.weekday),
            time: slot.time,
            effectiveFrom: parseIsoDate(student.since),
            effectiveTo: null,
          })),
        },
        payments: {
          create: student.payments.map((payment) => ({
            id: payment.id,
            reference: payment.reference,
            dueDate: parseIsoDate(payment.dueDate),
            amount: payment.amount,
            status: payment.status,
            method: payment.method
              ? toDbPaymentMethod(payment.method)
              : null,
            paidAt: payment.paidAt ? parseIsoDate(payment.paidAt) : null,
          })),
        },
        assessments: {
          create: student.assessments.map((assessment) => ({
            id: assessment.id,
            date: parseIsoDate(assessment.date),
            assessmentType: assessment.assessmentType ?? 'Inicial',
            professional: assessment.professional ?? '',
            specialty: assessment.specialty ?? '',
            service: assessment.service ?? '',
            chiefComplaint: assessment.chiefComplaint ?? '',
            painScale: assessment.painScale ?? null,
            affectedRegion: assessment.affectedRegion ?? '',
            functionalLimitations: assessment.functionalLimitations ?? '',
            clinicalFindings: assessment.clinicalFindings ?? '',
            testsPerformed: assessment.testsPerformed ?? '',
            testResults: assessment.testResults ?? '',
            treatmentObjectives: assessment.treatmentObjectives ?? '',
            weeklyFrequency: assessment.weeklyFrequency ?? '',
            estimatedSessions: assessment.estimatedSessions ?? '',
            plannedTechniques: assessment.plannedTechniques ?? '',
            guidelines: assessment.guidelines ?? '',
            referrals: assessment.referrals ?? '',
            weight: assessment.weight,
            height: assessment.height,
            bodyFat: assessment.bodyFat ?? null,
            muscleMass: assessment.muscleMass ?? null,
            armRight: assessment.measures.armRight,
            armLeft: assessment.measures.armLeft,
            chest: assessment.measures.chest,
            waist: assessment.measures.waist,
            abdomen: assessment.measures.abdomen,
            hip: assessment.measures.hip,
            thighRight: assessment.measures.thighRight,
            thighLeft: assessment.measures.thighLeft,
            calfRight: assessment.measures.calfRight,
            calfLeft: assessment.measures.calfLeft,
          })),
        },
        evolutions: {
          create: student.evolutions.map((evolution) => ({
            id: evolution.id,
            date: parseIsoDate(evolution.date),
            professional: evolution.professional,
            clinical: evolution.clinical,
            complaints: evolution.complaints,
            improvements: evolution.improvements,
            exercises: evolution.exercises,
            conduct: evolution.conduct,
          })),
        },
        photos: {
          create: student.photos.map((photo) => ({
            id: photo.id,
            date: parseIsoDate(photo.date),
            label: photo.label,
            url: photo.url,
          })),
        },
      },
    })
  }

  type SeedClinicalAttendance = {
    id: string
    studentId: string
    serviceId: string
    professionalId: string
    date: string
    weekday: Weekday
    time: string
    durationMinutes: number
    status: 'agendada' | 'realizada' | 'falta' | 'cancelada'
    notes?: string
  }

  const today = new Date()
  const thisMonday = getMonday(today)
  const lastMonday = addDays(thisMonday, -7)
  const todayIso = toIsoDate(today)

  function dayOfWeek(
    monday: Date,
    weekdayIndex: number,
  ): { date: string; weekday: Weekday } {
    const date = addDays(monday, weekdayIndex)
    return {
      date: toIsoDate(date),
      weekday: weekdays[weekdayIndex]!,
    }
  }

  function statusForDate(date: string): 'agendada' | 'realizada' {
    return date < todayIso ? 'realizada' : 'agendada'
  }

  const exampleClinicalAttendances: SeedClinicalAttendance[] = [
    // Histórico da pessoa exemplo (Helena)
    {
      id: 'ca-ex1',
      studentId: 's-exemplo',
      serviceId: 'svc-avaliacao',
      professionalId: 'prof1',
      ...dayOfWeek(lastMonday, 5),
      time: '09:00',
      durationMinutes: 60,
      status: 'realizada',
      notes: 'Avaliação fisioterapêutica inicial — ombro D e cervical.',
    },
    {
      id: 'ca-ex2',
      studentId: 's-exemplo',
      serviceId: 'svc-fisioterapia',
      professionalId: 'prof1',
      ...dayOfWeek(lastMonday, 4),
      time: '10:00',
      durationMinutes: 60,
      status: 'realizada',
      notes: 'Sessão de reabilitação de manguito rotador; boa resposta.',
    },
    {
      id: 'ca-ex3',
      studentId: 's-exemplo',
      serviceId: 'svc-massoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(lastMonday, 2),
      time: '15:00',
      durationMinutes: 60,
      status: 'realizada',
      notes: 'Massoterapia cervical e escapular para alívio de tensão.',
    },
    // Agenda da semana atual — grade de exemplo
    {
      id: 'ca-w1',
      studentId: 's1',
      serviceId: 'svc-avaliacao',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 0),
      time: '08:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 0).date),
      notes: 'Avaliação inicial de postura e ombro.',
    },
    {
      id: 'ca-w2',
      studentId: 's-exemplo',
      serviceId: 'svc-fisioterapia',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 0),
      time: '10:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 0).date),
      notes: 'Retorno semanal de fisioterapia.',
    },
    {
      id: 'ca-w3',
      studentId: 's3',
      serviceId: 'svc-massoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(thisMonday, 0),
      time: '15:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 0).date),
    },
    {
      id: 'ca-w4',
      studentId: 's5',
      serviceId: 'svc-auriculoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(thisMonday, 1),
      time: '09:00',
      durationMinutes: 45,
      status: statusForDate(dayOfWeek(thisMonday, 1).date),
    },
    {
      id: 'ca-w5',
      studentId: 's2',
      serviceId: 'svc-fisioterapia',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 1),
      time: '16:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 1).date),
      notes: 'Lombalgia — progressão de exercícios.',
    },
    {
      id: 'ca-w6',
      studentId: 's4',
      serviceId: 'svc-massoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(thisMonday, 2),
      time: '08:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 2).date),
    },
    {
      id: 'ca-w7',
      studentId: 's6',
      serviceId: 'svc-avaliacao',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 2),
      time: '10:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 2).date),
    },
    {
      id: 'ca-w8',
      studentId: 's7',
      serviceId: 'svc-fisioterapia',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 2),
      time: '17:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 2).date),
    },
    {
      id: 'ca-w9',
      studentId: 's8',
      serviceId: 'svc-auriculoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(thisMonday, 3),
      time: '09:00',
      durationMinutes: 45,
      status: statusForDate(dayOfWeek(thisMonday, 3).date),
    },
    {
      id: 'ca-w10',
      studentId: 's1',
      serviceId: 'svc-fisioterapia',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 3),
      time: '15:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 3).date),
    },
    {
      id: 'ca-w11',
      studentId: 's3',
      serviceId: 'svc-massoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(thisMonday, 3),
      time: '16:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 3).date),
    },
    {
      id: 'ca-w12',
      studentId: 's-exemplo',
      serviceId: 'svc-fisioterapia',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 4),
      time: '10:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 4).date),
      notes: 'Retorno semanal — ombro D.',
    },
    {
      id: 'ca-w13',
      studentId: 's2',
      serviceId: 'svc-massoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(thisMonday, 4),
      time: '16:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 4).date),
    },
    {
      id: 'ca-w14',
      studentId: 's5',
      serviceId: 'svc-avaliacao',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 5),
      time: '08:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 5).date),
    },
    {
      id: 'ca-w15',
      studentId: 's4',
      serviceId: 'svc-massoterapia',
      professionalId: 'prof3',
      ...dayOfWeek(thisMonday, 5),
      time: '09:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 5).date),
    },
    {
      id: 'ca-w16',
      studentId: 's6',
      serviceId: 'svc-fisioterapia',
      professionalId: 'prof1',
      ...dayOfWeek(thisMonday, 5),
      time: '10:00',
      durationMinutes: 60,
      status: statusForDate(dayOfWeek(thisMonday, 5).date),
    },
  ]

  const clinicStudentIds = [
    ...new Set(exampleClinicalAttendances.map((a) => a.studentId)),
  ]
  await prisma.student.updateMany({
    where: { id: { in: clinicStudentIds } },
    data: { usesClinic: true },
  })

  for (const attendance of exampleClinicalAttendances) {
    await prisma.clinicalAttendance.create({
      data: {
        id: attendance.id,
        studioId: studioRow.id,
        studentId: attendance.studentId,
        serviceId: attendance.serviceId,
        professionalId: attendance.professionalId,
        date: parseIsoDate(attendance.date),
        weekday: toDbWeekday(attendance.weekday),
        time: attendance.time,
        durationMinutes: attendance.durationMinutes,
        status: attendance.status,
        notes: attendance.notes ?? null,
      },
    })
  }

  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        id: expense.id,
        studioId: studioRow.id,
        name: expense.name,
        category: expense.category,
        amount: expense.amount,
        dueDay: expense.dueDay,
        status: expense.status,
        paidAt: expense.paidAt ? parseIsoDate(expense.paidAt) : null,
        recurring: expense.recurring,
        notes: expense.notes ?? null,
      },
    })
  }

  for (const contract of contracts) {
    await prisma.contract.create({
      data: {
        id: contract.id,
        studioId: studioRow.id,
        studentId: contract.studentId,
        number: contract.number,
        planId: contract.planId,
        planLabel: contract.planLabel,
        startDate: parseIsoDate(contract.startDate),
        endDate: parseIsoDate(contract.endDate),
        status: contract.status,
        monthlyValue: contract.monthlyValue,
        discountPercent: contract.discountPercent,
        discountNote: contract.discountNote ?? null,
        dueDay: contract.dueDay,
        paymentMethod: toDbPaymentMethod(contract.paymentMethod),
        financialResponsible: contract.financialResponsible,
        lateFeePercent: contract.lateFeePercent,
        interestPercent: contract.interestPercent,
        clauses: contract.clauses as Prisma.InputJsonValue,
        signedAt: contract.signedAt ? parseIsoDate(contract.signedAt) : null,
        signatureName: contract.signatureName ?? null,
        version: contract.version,
        previousVersions: contract.previousVersions as Prisma.InputJsonValue,
        history: contract.history as Prisma.InputJsonValue,
        createdAt: parseIsoDate(contract.createdAt),
        updatedAt: parseIsoDate(contract.updatedAt),
      },
    })
  }

  for (const campaign of campaigns) {
    await prisma.campaign.create({
      data: {
        id: campaign.id,
        studioId: studioRow.id,
        name: campaign.name,
        type: campaign.type,
        channel: campaign.channel,
        audience: campaign.audience,
        audienceLabel: campaign.audienceLabel,
        startDate: parseIsoDate(campaign.startDate),
        endDate: campaign.endDate ? parseIsoDate(campaign.endDate) : null,
        scheduledAt: campaign.scheduledAt
          ? new Date(campaign.scheduledAt)
          : null,
        status: campaign.status,
        messageTemplate: campaign.messageTemplate,
        variables: campaign.variables as Prisma.InputJsonValue,
        attachments: campaign.attachments as Prisma.InputJsonValue,
        automation: campaign.automation ?? null,
        statsSent: campaign.stats.sent,
        statsOpened: campaign.stats.opened,
        statsClicked: campaign.stats.clicked,
        statsConverted: campaign.stats.converted,
        createdAt: parseIsoDate(campaign.createdAt),
        updatedAt: parseIsoDate(campaign.updatedAt),
      },
    })
  }

  await seedAdminUser()

  console.log('Seed concluído.')
}

async function seedAdminUser() {
  const { hashPassword } = await import('../lib/auth/password')
  const email = 'admin@healthcore.com'
  const passwordHash = await hashPassword('Admin@123')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.account.deleteMany({
      where: { userId: existing.id, providerId: 'credential' },
    })
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: 'Administrador HealthCore',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    })
    await prisma.account.create({
      data: {
        userId: existing.id,
        accountId: existing.id,
        providerId: 'credential',
        password: passwordHash,
      },
    })
    console.log('Admin atualizado:', email)
    return
  }

  const user = await prisma.user.create({
    data: {
      name: 'Administrador HealthCore',
      email,
      emailVerified: true,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  })
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: passwordHash,
    },
  })
  console.log('Admin criado:', email, '/ senha temporária Admin@123')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
