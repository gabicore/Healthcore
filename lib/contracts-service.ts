import type {
  Contract,
  ContractHistoryEntry,
  ContractVersion,
  PlanPeriod,
} from '@/lib/data'
import {
  contractEndDateForPeriod,
  contractTotalClasses,
  defaultContractClauses,
} from '@/lib/data'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  decimalToNumber,
  fromDbPaymentMethod,
  fromDbWeekday,
  parseIsoDate,
  toDbPaymentMethod,
  toIsoDateOnly,
} from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'
import type {
  CreateContractInput,
  UpdateContractInput,
} from '@/lib/validations/contract'
import type { Contract as DbContract, Prisma } from '@prisma/client'

function asStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

function asHistory(value: Prisma.JsonValue): ContractHistoryEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const e = entry as Record<string, unknown>
      if (
        typeof e.at !== 'string' ||
        typeof e.action !== 'string' ||
        typeof e.by !== 'string'
      ) {
        return null
      }
      return { at: e.at, action: e.action, by: e.by }
    })
    .filter((e): e is ContractHistoryEntry => e !== null)
}

/**
 * Alinha cadastro do aluno (plano, cobrança e agenda fixa) ao contrato assinado (ativo).
 */
export async function syncStudentWithActiveContract(contract: DbContract) {
  if (contract.status !== 'ativo') return

  const plan = await prisma.plan.findUnique({ where: { id: contract.planId } })
  if (!plan) return

  const student = await prisma.student.findUnique({
    where: { id: contract.studentId },
    include: { schedule: true },
  })
  if (!student) return

  const overflow = [...student.schedule]
    .sort((a, b) =>
      `${a.weekday}${a.time}`.localeCompare(`${b.weekday}${b.time}`),
    )
    .slice(plan.frequency)

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: contract.studentId },
      data: {
        planId: contract.planId,
        monthlyValue: decimalToNumber(contract.monthlyValue),
        discountPercent: contract.discountPercent,
        dueDay: contract.dueDay,
        paymentMethod: contract.paymentMethod,
        active: true,
      },
    })
    if (overflow.length > 0) {
      await tx.scheduleSlot.deleteMany({
        where: {
          studentId: contract.studentId,
          id: { in: overflow.map((s) => s.id) },
        },
      })
    }
  })
}

/** Contrato assinado que governa plano/financeiro/agenda. Rascunhos são ignorados. */
export async function findGoverningContract(studentId: string) {
  return prisma.contract.findFirst({
    where: { studentId, status: 'ativo' },
    orderBy: { startDate: 'desc' },
  })
}

/** Ativa ou desativa o aluno conforme existência de contrato assinado válido. */
export async function syncStudentActiveFromContracts(studentId: string) {
  const governing = await findGoverningContract(studentId)
  await prisma.student.update({
    where: { id: studentId },
    data: { active: Boolean(governing) },
  })
  return Boolean(governing)
}

/** Garante que o aluno reflita o contrato ativo (assinado), se houver. */
export async function syncStudentFromActiveContract(studentId: string) {
  const active = await findGoverningContract(studentId)
  if (!active) {
    await prisma.student.update({
      where: { id: studentId },
      data: { active: false },
    })
    return null
  }
  await syncStudentWithActiveContract(active)
  return active
}

async function endOtherActiveContracts(studentId: string, keepId: string) {
  await prisma.contract.updateMany({
    where: {
      studentId,
      status: 'ativo',
      id: { not: keepId },
    },
    data: { status: 'encerrado' },
  })
}

function asVersions(value: Prisma.JsonValue): ContractVersion[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const e = entry as Record<string, unknown>
      if (
        typeof e.version !== 'number' ||
        typeof e.changedAt !== 'string' ||
        typeof e.summary !== 'string'
      ) {
        return null
      }
      return {
        version: e.version,
        changedAt: e.changedAt,
        summary: e.summary,
      }
    })
    .filter((e): e is ContractVersion => e !== null)
}

export function serializeContract(row: DbContract): Contract {
  return {
    id: row.id,
    studentId: row.studentId,
    number: row.number,
    planId: row.planId,
    planLabel: row.planLabel,
    startDate: toIsoDateOnly(row.startDate),
    endDate: toIsoDateOnly(row.endDate),
    status: row.status,
    monthlyValue: decimalToNumber(row.monthlyValue),
    discountPercent: row.discountPercent,
    discountNote: row.discountNote ?? undefined,
    dueDay: row.dueDay,
    paymentMethod: fromDbPaymentMethod(row.paymentMethod),
    financialResponsible: row.financialResponsible,
    lateFeePercent: row.lateFeePercent,
    interestPercent: row.interestPercent,
    clauses: asStringArray(row.clauses),
    signedAt: row.signedAt ? toIsoDateOnly(row.signedAt) : undefined,
    signatureName: row.signatureName ?? undefined,
    version: row.version,
    previousVersions: asVersions(row.previousVersions),
    history: asHistory(row.history),
    createdAt: toIsoDateOnly(row.createdAt),
    updatedAt: toIsoDateOnly(row.updatedAt),
  }
}

async function historyActor() {
  const studio = await prisma.studio.findUnique({
    where: { id: DEFAULT_STUDIO_ID },
  })
  return studio?.owner ?? 'Sistema'
}

async function nextContractNumber(year: number) {
  const prefix = `#${year}-`
  const existing = await prisma.contract.findMany({
    where: {
      studioId: DEFAULT_STUDIO_ID,
      number: { startsWith: prefix },
    },
    select: { number: true },
  })
  let max = 0
  for (const row of existing) {
    const seq = Number(row.number.slice(prefix.length))
    if (!Number.isNaN(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export async function listStudentContracts(studentId: string) {
  const rows = await prisma.contract.findMany({
    where: { studentId },
    orderBy: { startDate: 'desc' },
  })
  return rows.map(serializeContract)
}

export async function getContractById(id: string) {
  const row = await prisma.contract.findUnique({ where: { id } })
  return row ? serializeContract(row) : null
}

export async function createContractRecord(
  studentId: string,
  input: CreateContractInput,
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) throw new Error('Aluno não encontrado')

  const activeContract = await prisma.contract.findFirst({
    where: { studentId, status: 'ativo' },
    select: { number: true },
  })
  if (activeContract) {
    throw new Error(
      `Já existe um contrato ativo para este aluno (${activeContract.number}). Encerre ou rescinda o atual antes de criar outro.`,
    )
  }

  const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
  if (!plan) throw new Error('Plano não encontrado')

  const startIso =
    input.startDate ?? new Date().toISOString().slice(0, 10)
  const start = parseIsoDate(startIso)
  const end = input.endDate
    ? parseIsoDate(input.endDate)
    : parseIsoDate(
        contractEndDateForPeriod(startIso, plan.period as PlanPeriod),
      )

  const year = start.getUTCFullYear()
  const number = input.number ?? (await nextContractNumber(year))
  const today = new Date().toISOString().slice(0, 10)
  const by = await historyActor()

  const created = await prisma.contract.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      studentId,
      number,
      planId: plan.id,
      planLabel: input.planLabel ?? plan.name,
      startDate: start,
      endDate: end,
      status: input.status ?? 'rascunho',
      monthlyValue:
        input.monthlyValue ?? decimalToNumber(student.monthlyValue),
      discountPercent:
        input.discountPercent ?? student.discountPercent ?? 0,
      discountNote: input.discountNote ?? null,
      dueDay: input.dueDay ?? student.dueDay,
      paymentMethod: toDbPaymentMethod(
        input.paymentMethod ?? fromDbPaymentMethod(student.paymentMethod),
      ),
      financialResponsible:
        input.financialResponsible ?? student.name,
      lateFeePercent: input.lateFeePercent ?? 2,
      interestPercent: input.interestPercent ?? 1,
      clauses: (input.clauses ?? defaultContractClauses) as Prisma.InputJsonValue,
      version: 1,
      previousVersions: [] as Prisma.InputJsonValue,
      history: [
        { at: today, action: 'Contrato criado', by },
      ] as Prisma.InputJsonValue,
    },
  })
  if (created.status === 'ativo') {
    await endOtherActiveContracts(studentId, created.id)
    await syncStudentWithActiveContract(created)
  }
  return serializeContract(created)
}

export async function updateContractRecord(
  id: string,
  input: UpdateContractInput,
) {
  const existing = await prisma.contract.findUnique({ where: { id } })
  if (!existing) return null

  if (input.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
    if (!plan) throw new Error('Plano não encontrado')
  }

  const by = await historyActor()
  const today = new Date().toISOString().slice(0, 10)
  let history = asHistory(existing.history)
  if (input.historyAction) {
    history = [{ at: today, action: input.historyAction, by }, ...history]
  }

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      ...(input.planId !== undefined ? { planId: input.planId } : {}),
      ...(input.planLabel !== undefined ? { planLabel: input.planLabel } : {}),
      ...(input.number !== undefined ? { number: input.number } : {}),
      ...(input.startDate !== undefined
        ? { startDate: parseIsoDate(input.startDate) }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: parseIsoDate(input.endDate) }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.monthlyValue !== undefined
        ? { monthlyValue: input.monthlyValue }
        : {}),
      ...(input.discountPercent !== undefined
        ? { discountPercent: input.discountPercent }
        : {}),
      ...(input.discountNote !== undefined
        ? { discountNote: input.discountNote }
        : {}),
      ...(input.dueDay !== undefined ? { dueDay: input.dueDay } : {}),
      ...(input.paymentMethod !== undefined
        ? { paymentMethod: toDbPaymentMethod(input.paymentMethod) }
        : {}),
      ...(input.financialResponsible !== undefined
        ? { financialResponsible: input.financialResponsible }
        : {}),
      ...(input.lateFeePercent !== undefined
        ? { lateFeePercent: input.lateFeePercent }
        : {}),
      ...(input.interestPercent !== undefined
        ? { interestPercent: input.interestPercent }
        : {}),
      ...(input.clauses !== undefined
        ? { clauses: input.clauses as Prisma.InputJsonValue }
        : {}),
      ...(input.signedAt !== undefined
        ? {
            signedAt: input.signedAt ? parseIsoDate(input.signedAt) : null,
          }
        : {}),
      ...(input.signatureName !== undefined
        ? { signatureName: input.signatureName }
        : {}),
      history: history as Prisma.InputJsonValue,
    },
  })

  const statusBecameActive =
    updated.status === 'ativo' && existing.status !== 'ativo'

  if (statusBecameActive) {
    await endOtherActiveContracts(updated.studentId, updated.id)
  }

  // Só contrato assinado (ativo) espelha financeiro e agenda.
  if (updated.status === 'ativo') {
    await syncStudentWithActiveContract(updated)
  } else if (existing.status === 'ativo') {
    await syncStudentActiveFromContracts(updated.studentId)
  }

  return serializeContract(updated)
}

export async function sendContractForSignatureRecord(id: string) {
  return updateContractRecord(id, {
    status: 'pendente_assinatura',
    historyAction: 'Enviado para assinatura eletrônica',
  })
}

export async function rescindContractRecord(id: string) {
  return updateContractRecord(id, {
    status: 'cancelado',
    historyAction: 'Contrato rescindido',
  })
}

export async function renewContractRecord(id: string) {
  const current = await prisma.contract.findUnique({
    where: { id },
    include: { plan: true },
  })
  if (!current) return null

  const startIso = new Date().toISOString().slice(0, 10)
  const start = parseIsoDate(startIso)
  const period = (current.plan?.period ?? 'semestral') as PlanPeriod
  const end = parseIsoDate(contractEndDateForPeriod(startIso, period))
  const year = start.getUTCFullYear()
  const number = await nextContractNumber(year)
  const today = new Date().toISOString().slice(0, 10)
  const by = await historyActor()
  const serialized = serializeContract(current)

  const renewed = await prisma.contract.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      studentId: current.studentId,
      number,
      planId: current.planId,
      planLabel: current.planLabel,
      startDate: start,
      endDate: end,
      status: 'rascunho',
      monthlyValue: current.monthlyValue,
      discountPercent: current.discountPercent,
      discountNote: current.discountNote,
      dueDay: current.dueDay,
      paymentMethod: current.paymentMethod,
      financialResponsible: current.financialResponsible,
      lateFeePercent: current.lateFeePercent,
      interestPercent: current.interestPercent,
      clauses: current.clauses as Prisma.InputJsonValue,
      version: 1,
      previousVersions: [
        {
          version: current.version,
          changedAt: today,
          summary: `Renovação a partir de ${current.number}`,
        },
        ...serialized.previousVersions,
      ] as Prisma.InputJsonValue,
      history: [
        {
          at: today,
          action: `Renovação criada a partir de ${current.number}`,
          by,
        },
      ] as Prisma.InputJsonValue,
    },
  })

  await updateContractRecord(current.id, {
    status: current.status === 'ativo' ? 'encerrado' : current.status,
    historyAction: `Encerrado por renovação (${number})`,
  })

  return serializeContract(renewed)
}

export async function signContractRecord(
  id: string,
  signatureName?: string,
) {
  const existing = await prisma.contract.findUnique({ where: { id } })
  if (!existing) return null
  const name =
    signatureName?.trim() ||
    existing.financialResponsible ||
    'Assinado digitalmente'
  const today = new Date().toISOString().slice(0, 10)
  return updateContractRecord(id, {
    status: 'ativo',
    signedAt: today,
    signatureName: name,
    historyAction: 'Assinatura registrada · contrato ativado',
  })
}

export async function emailContractRecord(id: string) {
  const contract = await getContractById(id)
  if (!contract) return null

  const student = await prisma.student.findUnique({
    where: { id: contract.studentId },
  })
  if (!student?.email) {
    throw new Error('Aluno sem e-mail cadastrado')
  }

  const plan = await prisma.plan.findUnique({
    where: { id: contract.planId },
  })
  const planPrice = plan
    ? Number(plan.price)
    : contract.discountPercent > 0 && contract.discountPercent < 100
      ? Math.round(
          (contract.monthlyValue / (1 - contract.discountPercent / 100)) * 100,
        ) / 100
      : contract.monthlyValue
  const scheduleRows = await prisma.scheduleSlot.findMany({
    where: { studentId: contract.studentId },
    orderBy: [{ weekday: 'asc' }, { time: 'asc' }],
  })
  const totalClasses = plan
    ? contractTotalClasses({
        startDate: contract.startDate,
        endDate: contract.endDate,
        frequency: plan.frequency,
        schedule: scheduleRows.map((s) => ({
          weekday: fromDbWeekday(s.weekday),
          time: s.time,
        })),
        planId: plan.id,
      })
    : 0

  const { emailSender } = await import('@/lib/auth/email/console-sender')
  const studio = await prisma.studio.findUnique({
    where: { id: DEFAULT_STUDIO_ID },
  })
  const subject = `Contrato ${contract.number} — ${studio?.name ?? 'HealthCore'}`
  const text = [
    `Olá ${student.name},`,
    '',
    `Segue o resumo do contrato ${contract.number}:`,
    '',
    'Contratado (estúdio):',
    `Nome: ${studio?.name ?? '—'}`,
    `Responsável: ${studio?.owner ?? '—'}`,
    `CNPJ: ${studio?.cnpj || '—'}`,
    `Telefone: ${studio?.phone ?? '—'}`,
    `E-mail: ${studio?.email ?? '—'}`,
    `Endereço: ${studio?.address || '—'}`,
    '',
    `Plano: ${contract.planLabel}`,
    `Aulas do contrato: ${totalClasses > 0 ? `${totalClasses} aulas` : '—'}`,
    `Valor do plano: R$ ${planPrice.toFixed(2)}`,
    `Desconto: ${
      contract.discountPercent > 0
        ? `${contract.discountPercent}%${
            contract.discountNote ? ` · ${contract.discountNote}` : ''
          }`
        : 'Sem desconto'
    }`,
    `Valor final: R$ ${contract.monthlyValue.toFixed(2)}`,
    `Vigência: ${contract.startDate} a ${contract.endDate}${
      totalClasses > 0 ? ` · ${totalClasses} aulas` : ''
    }`,
    `Status: ${contract.status}`,
    `Responsável financeiro: ${contract.financialResponsible}`,
    '',
    'Cláusulas:',
    ...contract.clauses.map((c, i) => `${i + 1}. ${c}`),
    '',
    studio?.name ?? 'HealthCore',
  ].join('\n')

  await emailSender.send({
    to: student.email,
    subject,
    text,
    html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${text}</pre>`,
  })

  await updateContractRecord(id, {
    historyAction: `Contrato enviado por e-mail para ${student.email}`,
  })

  return { contract, emailedTo: student.email }
}

export async function deleteContractRecord(id: string) {
  const existing = await prisma.contract.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.contract.delete({ where: { id } })
  return true
}
