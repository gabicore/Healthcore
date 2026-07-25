import type {
  Contract,
  ContractHistoryEntry,
  ContractVersion,
} from '@/lib/data'
import { defaultContractClauses } from '@/lib/data'
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

  const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
  if (!plan) throw new Error('Plano não encontrado')

  const start = input.startDate
    ? parseIsoDate(input.startDate)
    : parseIsoDate(new Date().toISOString().slice(0, 10))
  const end = input.endDate
    ? parseIsoDate(input.endDate)
    : (() => {
        const d = new Date(start)
        d.setUTCMonth(d.getUTCMonth() + 6)
        return d
      })()

  const year = start.getUTCFullYear()
  const count = await prisma.contract.count({
    where: { studioId: DEFAULT_STUDIO_ID },
  })
  const number =
    input.number ?? `#${year}-${String(count + 1).padStart(3, '0')}`
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
  const current = await prisma.contract.findUnique({ where: { id } })
  if (!current) return null

  const start = parseIsoDate(new Date().toISOString().slice(0, 10))
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 6)
  const year = start.getUTCFullYear()
  const count = await prisma.contract.count({
    where: { studioId: DEFAULT_STUDIO_ID },
  })
  const number = `#${year}-${String(count + 1).padStart(3, '0')}`
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

export async function deleteContractRecord(id: string) {
  const existing = await prisma.contract.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.contract.delete({ where: { id } })
  return true
}
