import type {
  Contract,
  ContractHistoryEntry,
  ContractSignatureInfo,
  ContractVersion,
  PlanPeriod,
} from '@/lib/data'
import {
  contractEndDateForPeriod,
  defaultContractClauses,
} from '@/lib/data'
import {
  generateSigningToken,
  signingUrlForToken,
} from '@/lib/contract-document'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import {
  decimalToNumber,
  fromDbPaymentMethod,
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
    include: {
      schedule: { where: { effectiveTo: null } },
    },
  })
  if (!student) return

  // Só a grade atual (effectiveTo null) conta no limite semanal —
  // períodos históricos não podem ser apagados no sync a cada refresh.
  const overflow = [...student.schedule]
    .sort((a, b) =>
      `${a.weekday}${a.time}`.localeCompare(`${b.weekday}${b.time}`),
    )
    .slice(plan.frequency)

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: contract.studentId },
      data: {
        active: true,
        since: contract.startDate,
        planId: contract.planId,
        monthlyValue: decimalToNumber(contract.monthlyValue),
        discountPercent: contract.discountPercent,
        dueDay: contract.dueDay,
        paymentMethod: contract.paymentMethod,
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

/** Agenda fixa só existe com contrato ativo. */
export async function clearStudentFixedSchedule(studentId: string) {
  await prisma.scheduleSlot.deleteMany({ where: { studentId } })
}

async function markStudentInactiveWithoutContract(studentId: string) {
  const exists = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  })
  if (!exists) return

  await clearStudentFixedSchedule(studentId)
  await prisma.student.update({
    where: { id: studentId },
    data: { active: false },
  })
}

/** Contrato assinado que governa plano/financeiro/agenda. Rascunhos são ignorados. */
export async function findGoverningContract(studentId: string) {
  return prisma.contract.findFirst({
    where: { studentId, status: 'ativo' },
    orderBy: { startDate: 'desc' },
  })
}

/**
 * Garante que o aluno reflita o contrato ativo (assinado), se houver.
 * Sem contrato ativo, limpa a agenda fixa e marca como inativo.
 */
export async function syncStudentFromActiveContract(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) return null

  const active = await findGoverningContract(studentId)
  if (!active) {
    await markStudentInactiveWithoutContract(studentId)
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

type ContractWithSignature = DbContract & {
  signingToken?: string | null
  validationCode?: string | null
  signature?: {
    id: string
    signerName: string
    signatureImage: string
    signedAt: Date
    validationCode: string
    documentHash: string
    contractVersion: number
  } | null
}

export function serializeContract(row: ContractWithSignature): Contract {
  const electronicSignature: ContractSignatureInfo | undefined = row.signature
    ? {
        id: row.signature.id,
        signerName: row.signature.signerName,
        signatureImage: row.signature.signatureImage,
        signedAt: row.signature.signedAt.toISOString(),
        validationCode: row.signature.validationCode,
        documentHash: row.signature.documentHash,
        contractVersion: row.signature.contractVersion,
      }
    : undefined

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
    signingToken: row.signingToken ?? undefined,
    validationCode:
      row.validationCode ?? electronicSignature?.validationCode ?? undefined,
    electronicSignature,
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
    include: { signature: true },
    orderBy: { startDate: 'desc' },
  })
  return rows.map(serializeContract)
}

export async function getContractById(id: string) {
  const row = await prisma.contract.findUnique({
    where: { id },
    include: { signature: true },
  })
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
  const signingToken = generateSigningToken()

  const created = await prisma.contract.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      studentId,
      number,
      planId: plan.id,
      planLabel: input.planLabel ?? plan.name,
      startDate: start,
      endDate: end,
      status: 'rascunho',
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
      signingToken,
      version: 1,
      previousVersions: [] as Prisma.InputJsonValue,
      history: [
        { at: today, action: 'Contrato criado', by },
      ] as Prisma.InputJsonValue,
    },
    include: { signature: true },
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
  options?: {
    status?: Contract['status']
  },
) {
  const existing = await prisma.contract.findUnique({
    where: { id },
    include: { signature: true },
  })
  if (!existing) return null

  const contentKeys: (keyof UpdateContractInput)[] = [
    'planId',
    'planLabel',
    'number',
    'startDate',
    'endDate',
    'monthlyValue',
    'discountPercent',
    'discountNote',
    'dueDay',
    'paymentMethod',
    'financialResponsible',
    'lateFeePercent',
    'interestPercent',
    'clauses',
  ]
  const touchesContent = contentKeys.some((key) => input[key] !== undefined)
  if (
    touchesContent &&
    (existing.status === 'ativo' ||
      existing.status === 'encerrado' ||
      existing.status === 'cancelado' ||
      existing.signature)
  ) {
    throw new Error(
      'Contrato assinado ou encerrado não pode ser alterado. Crie uma renovação para nova versão.',
    )
  }

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

  const nextStatus = options?.status

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
      ...(nextStatus !== undefined ? { status: nextStatus } : {}),
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
    include: { signature: true },
  })

  const statusBecameActive =
    updated.status === 'ativo' && existing.status !== 'ativo'
  const statusLeftActive =
    existing.status === 'ativo' && updated.status !== 'ativo'

  if (statusBecameActive) {
    await endOtherActiveContracts(updated.studentId, updated.id)
  }

  // Só contrato assinado (ativo) espelha financeiro e agenda.
  if (updated.status === 'ativo') {
    await syncStudentWithActiveContract(updated)
  } else if (statusLeftActive) {
    // Sem outro ativo, agenda fixa some e o aluno fica inativo.
    const stillActive = await findGoverningContract(updated.studentId)
    if (!stillActive) {
      await markStudentInactiveWithoutContract(updated.studentId)
    }
  }

  return serializeContract(updated)
}

export async function sendContractForSignatureRecord(id: string) {
  const existing = await prisma.contract.findUnique({
    where: { id },
    select: { id: true, status: true, signature: { select: { id: true } } },
  })
  if (!existing) return null
  if (existing.signature || existing.status === 'ativo') {
    throw new Error('Contrato já assinado')
  }

  const token = generateSigningToken()
  await prisma.contract.update({
    where: { id },
    data: {
      signingToken: token,
    },
  })

  return updateContractRecord(
    id,
    { historyAction: 'Enviado para assinatura eletrônica' },
    { status: 'pendente_assinatura' },
  )
}

export async function rescindContractRecord(id: string) {
  return updateContractRecord(
    id,
    { historyAction: 'Contrato rescindido' },
    { status: 'cancelado' },
  )
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
      signingToken: generateSigningToken(),
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
    include: { signature: true },
  })

  await updateContractRecord(
    current.id,
    { historyAction: `Encerrado por renovação (${number})` },
    {
      status: current.status === 'ativo' ? 'encerrado' : current.status,
    },
  )

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
  return updateContractRecord(
    id,
    {
      signedAt: today,
      signatureName: name,
      historyAction: 'Assinatura registrada · contrato ativado',
    },
    { status: 'ativo' },
  )
}

export async function emailContractRecord(id: string) {
  let contract = await getContractById(id)
  if (!contract) return null

  if (
    !contract.signingToken &&
    contract.status !== 'ativo' &&
    contract.status !== 'encerrado' &&
    contract.status !== 'cancelado'
  ) {
    const token = generateSigningToken()
    await prisma.contract.update({
      where: { id },
      data: { signingToken: token },
    })
    contract = (await getContractById(id)) ?? contract
  }

  const studentRow = await prisma.student.findUnique({
    where: { id: contract.studentId },
  })
  if (!studentRow?.email) {
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

  const {
    createEmailSender,
    resolveEmailTransport,
  } = await import('@/lib/auth/email')
  const {
    buildContractEmailHtml,
    buildContractEmailText,
  } = await import('@/lib/contract-email-html')
  const studioRow = await prisma.studio.findUnique({
    where: { id: DEFAULT_STUDIO_ID },
  })
  const studio = studioRow
    ? {
        id: studioRow.id,
        name: studioRow.name,
        owner: studioRow.owner,
        email: studioRow.email,
        phone: studioRow.phone,
        cnpj: studioRow.cnpj ?? '',
        address: studioRow.address ?? '',
        plan: 'Profissional' as const,
      }
    : null

  const student = {
    name: studentRow.name,
    birthDate: toIsoDateOnly(studentRow.birthDate),
    cpf: studentRow.cpf ?? '',
    phone: studentRow.phone ?? '',
    email: studentRow.email,
    cep: studentRow.cep ?? '',
    street: studentRow.street ?? '',
    addressNumber: studentRow.addressNumber ?? '',
    neighborhood: studentRow.neighborhood ?? '',
    city: studentRow.city ?? '',
    state: studentRow.state ?? '',
    address: studentRow.address ?? '',
  }

  const signingUrl = contract.signingToken
    ? signingUrlForToken(contract.signingToken)
    : undefined

  const transport = resolveEmailTransport()
  const subject = `Contrato ${contract.number} — ${studio?.name ?? 'HealthCore'}`
  const html = buildContractEmailHtml({
    contract,
    student,
    studio,
    planPrice,
    planPeriod: (plan?.period as PlanPeriod | undefined) ?? null,
    signingUrl,
  })
  const text = buildContractEmailText({
    contract,
    student,
    studio,
    planPrice,
    planPeriod: (plan?.period as PlanPeriod | undefined) ?? null,
    signingUrl,
  })

  await createEmailSender().send({
    to: studentRow.email,
    subject,
    text,
    html,
  })

  const updated = await updateContractRecord(id, {
    historyAction:
      transport === 'console'
        ? `Contrato preparado para e-mail (simulado no servidor) · ${studentRow.email}`
        : `Contrato enviado por e-mail para ${studentRow.email}`,
  })

  return {
    contract: updated ?? contract,
    emailedTo: studentRow.email,
    transport,
  }
}

export async function deleteContractRecord(id: string) {
  const existing = await prisma.contract.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.contract.delete({ where: { id } })
  return true
}
