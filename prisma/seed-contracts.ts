/**
 * Cria contratos ativos + agenda fixa para alunos sem contrato.
 * Espalha horários em Seg/Qua/Sex/Sáb (dias abertos do estúdio)
 * sem lotar a grade.
 *
 * Uso: npm run db:seed-contracts
 */
import 'dotenv/config'
import { PrismaClient, type Prisma } from '@prisma/client'

import { DEFAULT_STUDIO_ID } from '../lib/constants'
import {
  contractEndDateForPeriod,
  defaultContractClauses,
  type PlanPeriod,
  type Weekday,
} from '../lib/data'
import { parseIsoDate, toDbWeekday, toIsoDateOnly } from '../lib/db-mappers'

const prisma = new PrismaClient()

type SeedSlot = { weekday: Weekday; time: string }

/** Alunos sem contrato → planos distintos e horários espalhados. */
const SEED: Array<{
  studentId: string
  planId: string
  schedule: SeedSlot[]
  startOffsetDays?: number
}> = [
  {
    studentId: 's1', // Ana Beatriz
    planId: 'sem-2x',
    schedule: [
      { weekday: 'Segunda', time: '09:00' },
      { weekday: 'Quarta', time: '09:00' },
    ],
  },
  {
    studentId: 's2', // Carlos Eduardo
    planId: 'sem-3x',
    schedule: [
      { weekday: 'Segunda', time: '07:00' },
      { weekday: 'Quarta', time: '07:00' },
      { weekday: 'Sexta', time: '07:00' },
    ],
  },
  {
    studentId: 's3', // Mariana
    planId: 'sem-1x',
    schedule: [{ weekday: 'Quarta', time: '10:00' }],
  },
  {
    studentId: 's4', // Roberto
    planId: 'tri-2x',
    schedule: [
      { weekday: 'Quarta', time: '16:00' },
      { weekday: 'Sexta', time: '16:00' },
    ],
  },
  {
    studentId: 's5', // Fernanda
    planId: 'men-3x',
    schedule: [
      { weekday: 'Segunda', time: '15:00' },
      { weekday: 'Quarta', time: '15:00' },
      { weekday: 'Sexta', time: '15:00' },
    ],
  },
  {
    studentId: 's6', // Juliana
    planId: 'men-1x',
    schedule: [{ weekday: 'Sábado', time: '09:00' }],
  },
  {
    studentId: 's7', // Pedro Henrique
    planId: 'tri-3x',
    schedule: [
      { weekday: 'Segunda', time: '17:00' },
      { weekday: 'Quarta', time: '17:00' },
      { weekday: 'Sexta', time: '17:00' },
    ],
  },
  {
    studentId: 's8', // Beatriz Ramos
    planId: 'tri-1x',
    schedule: [{ weekday: 'Sexta', time: '10:00' }],
  },
  {
    studentId: 'cms23wxeg000psl6mfohfkk0o', // Gabriela
    planId: 'men-2x',
    schedule: [
      { weekday: 'Segunda', time: '10:00' },
      { weekday: 'Sexta', time: '09:00' },
    ],
  },
]

function addDaysIso(iso: string, days: number) {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDateOnly(d)
}

async function nextContractNumber(year: number) {
  const prefix = `CTR-${year}-`
  const latest = await prisma.contract.findFirst({
    where: {
      studioId: DEFAULT_STUDIO_ID,
      number: { startsWith: prefix },
    },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const seq = latest ? Number(latest.number.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

async function main() {
  console.log('Seed de contratos / agenda fixa...')

  const today = toIsoDateOnly(new Date())
  let created = 0
  let skipped = 0

  for (const entry of SEED) {
    const student = await prisma.student.findUnique({
      where: { id: entry.studentId },
      include: {
        contracts: { where: { status: 'ativo' }, select: { id: true } },
      },
    })
    if (!student) {
      console.log(`  skip ${entry.studentId}: aluno não encontrado`)
      skipped++
      continue
    }
    if (student.contracts.length > 0) {
      console.log(`  skip ${student.name}: já tem contrato ativo`)
      skipped++
      continue
    }

    const plan = await prisma.plan.findUnique({ where: { id: entry.planId } })
    if (!plan) {
      console.log(`  skip ${student.name}: plano ${entry.planId} não existe`)
      skipped++
      continue
    }

    if (entry.schedule.length > plan.frequency) {
      console.log(
        `  skip ${student.name}: agenda (${entry.schedule.length}) > frequência (${plan.frequency})`,
      )
      skipped++
      continue
    }

    const startIso = addDaysIso(today, entry.startOffsetDays ?? 0)
    const endIso = contractEndDateForPeriod(
      startIso,
      plan.period as PlanPeriod,
    )
    const year = Number(startIso.slice(0, 4))
    const number = await nextContractNumber(year)
    const planLabel = `${plan.name.split(' · ')[0]} · ${plan.frequency}x / semana`

    await prisma.$transaction(async (tx) => {
      await tx.scheduleSlot.deleteMany({ where: { studentId: student.id } })
      await tx.scheduleSlot.createMany({
        data: entry.schedule.map((slot) => ({
          studentId: student.id,
          weekday: toDbWeekday(slot.weekday),
          time: slot.time,
        })),
      })

      await tx.contract.create({
        data: {
          studioId: DEFAULT_STUDIO_ID,
          studentId: student.id,
          number,
          planId: plan.id,
          planLabel,
          startDate: parseIsoDate(startIso),
          endDate: parseIsoDate(endIso),
          status: 'ativo',
          monthlyValue: plan.price,
          discountPercent: 0,
          dueDay: student.dueDay,
          paymentMethod: student.paymentMethod,
          financialResponsible: student.name,
          lateFeePercent: 2,
          interestPercent: 1,
          clauses: defaultContractClauses as unknown as Prisma.InputJsonValue,
          signedAt: parseIsoDate(startIso),
          signatureName: student.name,
          version: 1,
          previousVersions: [] as Prisma.InputJsonValue,
          history: [
            {
              at: startIso,
              action: 'Seed · contrato ativo criado',
              by: 'Sistema',
            },
          ] as Prisma.InputJsonValue,
        },
      })

      await tx.student.update({
        where: { id: student.id },
        data: {
          active: true,
          planId: plan.id,
          monthlyValue: plan.price,
          discountPercent: 0,
        },
      })
    })

    console.log(
      `  ok ${student.name} · ${planLabel} · ${entry.schedule
        .map((s) => `${s.weekday} ${s.time}`)
        .join(', ')}`,
    )
    created++
  }

  console.log(`Concluído: ${created} contratos criados, ${skipped} ignorados.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
