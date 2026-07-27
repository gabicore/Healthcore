import 'dotenv/config'
import { PrismaClient, type Prisma } from '@prisma/client'
import {
  afternoonSlots,
  campaigns,
  contracts,
  expenses,
  morningSlots,
  plans,
  professionals,
  SLOT_CAPACITY,
  students,
  studio,
  studioHours,
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

  for (const hour of studioHours) {
    await prisma.studioHour.create({
      data: {
        studioId: studioRow.id,
        weekday: toDbWeekday(hour.weekday),
        open: hour.open,
        close: hour.close,
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
        cep: student.cep,
        address: student.address,
        emergencyContact: student.emergencyContact,
        active: student.active,
        since: parseIsoDate(student.since),
        objective: student.objective,
        pathologies: student.pathologies,
        injuries: student.injuries,
        surgeries: student.surgeries,
        restrictions: student.restrictions,
        medications: student.medications,
        notes: student.notes,
        planId: student.planId,
        monthlyValue: student.monthlyValue,
        discountPercent: student.discountPercent ?? 0,
        dueDay: student.dueDay,
        paymentMethod: toDbPaymentMethod(student.paymentMethod),
        schedule: {
          create: student.schedule.map((slot) => ({
            weekday: toDbWeekday(slot.weekday),
            time: slot.time,
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
