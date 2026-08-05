import type { Prisma } from '@prisma/client'

import {
  buildContractDocumentSnapshot,
  generateSigningToken,
  generateValidationCode,
  hashContractDocument,
  parseDocumentSnapshot,
  signingUrlForToken,
} from '@/lib/contract-document'
import {
  serializeContract,
  updateContractRecord,
} from '@/lib/contracts-service'
import type { PublicSigningContract } from '@/lib/contracts-signing-types'
import {
  contractStatusLabel,
  formatCurrency,
  formatShortDate,
  type ContractStatus,
} from '@/lib/data'
import { fromDbPaymentMethod, toIsoDateOnly } from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'

export type { PublicSigningContract } from '@/lib/contracts-signing-types'

function asStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

export async function ensureSigningToken(contractId: string) {
  const existing = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      signingToken: true,
      signature: { select: { id: true } },
    },
  })
  if (!existing) return null
  if (existing.signature || existing.status === 'ativo') {
    return existing.signingToken
  }
  if (existing.signingToken) return existing.signingToken

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateSigningToken()
    try {
      const updated = await prisma.contract.update({
        where: { id: contractId },
        data: { signingToken: token },
        select: { signingToken: true },
      })
      return updated.signingToken
    } catch {
      /* unique collision — retry */
    }
  }
  throw new Error('Não foi possível gerar token de assinatura')
}

export async function refreshSigningToken(contractId: string) {
  const existing = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      signature: { select: { id: true } },
    },
  })
  if (!existing) return null
  if (existing.signature || existing.status === 'ativo') {
    throw new Error('Contrato já assinado — não é possível renovar o link')
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateSigningToken()
    try {
      const updated = await prisma.contract.update({
        where: { id: contractId },
        data: { signingToken: token },
        select: { signingToken: true },
      })
      return updated.signingToken
    } catch {
      /* retry */
    }
  }
  throw new Error('Não foi possível gerar token de assinatura')
}

export async function getContractBySigningToken(token: string) {
  const trimmed = token.trim()
  if (!trimmed) return null

  const row = await prisma.contract.findUnique({
    where: { signingToken: trimmed },
    include: {
      student: {
        select: { name: true, cpf: true },
      },
      signature: true,
    },
  })

  if (!row) {
    // Token limpo após assinatura — tenta achar pela assinatura.tokenUsed
    const byUsed = await prisma.contractSignature.findFirst({
      where: { tokenUsed: trimmed },
      include: {
        contract: {
          include: {
            student: { select: { name: true, cpf: true } },
            signature: true,
          },
        },
      },
    })
    if (!byUsed?.contract) return null
    return toPublicSigningContract(byUsed.contract, trimmed)
  }

  return toPublicSigningContract(row, trimmed)
}

function toPublicSigningContract(
  row: {
    number: string
    status: ContractStatus
    version: number
    planLabel: string
    startDate: Date
    endDate: Date
    monthlyValue: Prisma.Decimal | number
    discountPercent: number
    dueDay: number
    paymentMethod: string
    financialResponsible: string
    lateFeePercent: number
    interestPercent: number
    clauses: Prisma.JsonValue
    student: { name: string; cpf: string | null }
    signature: {
      signerName: string
      signedAt: Date
      validationCode: string
      documentHash: string
    } | null
  },
  token: string,
): PublicSigningContract {
  const monthlyValue =
    typeof row.monthlyValue === 'number'
      ? row.monthlyValue
      : Number(row.monthlyValue)
  const clauses = asStringArray(row.clauses)
  const alreadySigned = Boolean(row.signature) || row.status === 'ativo'
  const paymentMethod = fromDbPaymentMethod(
    row.paymentMethod as Parameters<typeof fromDbPaymentMethod>[0],
  )

  return {
    token,
    number: row.number,
    status: row.status,
    statusLabel: alreadySigned
      ? 'Assinado'
      : contractStatusLabel[row.status],
    version: row.version,
    studentName: row.student.name,
    planLabel: row.planLabel,
    startDate: toIsoDateOnly(row.startDate),
    endDate: toIsoDateOnly(row.endDate),
    monthlyValue,
    monthlyValueLabel: formatCurrency(monthlyValue),
    discountPercent: row.discountPercent,
    dueDay: row.dueDay,
    paymentMethod,
    financialResponsible: row.financialResponsible,
    lateFeePercent: row.lateFeePercent,
    interestPercent: row.interestPercent,
    clauses,
    clausesDocument: clauses.join('\n\n').trim(),
    alreadySigned,
    signedAt: row.signature
      ? row.signature.signedAt.toISOString()
      : undefined,
    signerName: row.signature?.signerName,
    validationCode: row.signature?.validationCode,
    documentHash: row.signature?.documentHash,
    signingUrl: signingUrlForToken(token),
  }
}

export async function signContractByToken(input: {
  token: string
  signerName: string
  signatureImage: string
  accepted: boolean
  ipAddress?: string
  userAgent?: string
}) {
  if (!input.accepted) {
    throw new Error('É necessário aceitar as condições do contrato')
  }
  const signerName = input.signerName.trim()
  if (signerName.length < 3) {
    throw new Error('Informe o nome completo')
  }
  const signatureImage = input.signatureImage.trim()
  if (
    !signatureImage.startsWith('data:image/') ||
    signatureImage.length < 100
  ) {
    throw new Error('Assinatura desenhada é obrigatória')
  }

  const token = input.token.trim()
  const row = await prisma.contract.findUnique({
    where: { signingToken: token },
    include: {
      student: { select: { name: true, cpf: true } },
      signature: true,
    },
  })
  if (!row) {
    throw new Error('Link de assinatura inválido ou já utilizado')
  }
  if (row.signature) {
    throw new Error('Este contrato já foi assinado')
  }
  if (row.status === 'encerrado' || row.status === 'cancelado') {
    throw new Error('Este contrato não está disponível para assinatura')
  }
  if (row.status !== 'pendente_assinatura' && row.status !== 'rascunho') {
    throw new Error('Este contrato não está disponível para assinatura')
  }

  const contract = serializeContract(row)
  const snapshot = buildContractDocumentSnapshot({
    contract,
    studentName: row.student.name,
    studentCpf: row.student.cpf ?? '',
  })
  const documentHash = hashContractDocument(snapshot)

  let validationCode = generateValidationCode()
  for (let attempt = 0; attempt < 8; attempt++) {
    const clash = await prisma.contractSignature.findUnique({
      where: { validationCode },
      select: { id: true },
    })
    if (!clash) break
    validationCode = generateValidationCode()
  }

  const signedAt = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.contractSignature.create({
      data: {
        contractId: row.id,
        signerName,
        signatureImage,
        signedAt,
        ipAddress: input.ipAddress?.slice(0, 191) ?? '',
        userAgent: input.userAgent?.slice(0, 2000) ?? '',
        tokenUsed: token,
        contractVersion: row.version,
        documentHash,
        documentSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        validationCode,
      },
    })

    await tx.contract.update({
      where: { id: row.id },
      data: {
        signingToken: null,
        validationCode,
        signatureName: signerName,
        signedAt,
      },
    })
  })

  const updated = await updateContractRecord(
    row.id,
    {
      historyAction: `Assinado eletronicamente por ${signerName} · ${validationCode}`,
    },
    { status: 'ativo' },
  )

  return {
    contract: updated ?? contract,
    signedAt: signedAt.toISOString(),
    signerName,
    validationCode,
    documentHash,
    signatureImage,
    snapshot,
  }
}

export type PublicValidationResult = {
  valid: boolean
  message: string
  number?: string
  signerName?: string
  signedAt?: string
  signedAtLabel?: string
  status?: string
  version?: number
  documentHash?: string
  validationCode?: string
}

export async function getContractByValidationCode(
  code: string,
): Promise<PublicValidationResult> {
  const validationCode = code.trim().toUpperCase()
  if (!validationCode) {
    return { valid: false, message: 'Código de validação inválido' }
  }

  const signature = await prisma.contractSignature.findUnique({
    where: { validationCode },
    include: {
      contract: { select: { number: true, status: true } },
    },
  })

  if (!signature) {
    return {
      valid: false,
      message: 'Documento não encontrado para este código',
    }
  }

  const snapshot = parseDocumentSnapshot(signature.documentSnapshot)
  const recomputed = snapshot ? hashContractDocument(snapshot) : null
  const hashMatches = recomputed === signature.documentHash

  if (!hashMatches) {
    return {
      valid: false,
      message: 'Hash do documento não confere com o registro salvo',
      number: signature.contract.number,
      signerName: signature.signerName,
      signedAt: signature.signedAt.toISOString(),
      signedAtLabel: formatDateTime(signature.signedAt),
      status: 'Inválido',
      version: signature.contractVersion,
      documentHash: signature.documentHash,
      validationCode: signature.validationCode,
    }
  }

  return {
    valid: true,
    message: 'Documento válido',
    number: signature.contract.number,
    signerName: signature.signerName,
    signedAt: signature.signedAt.toISOString(),
    signedAtLabel: formatDateTime(signature.signedAt),
    status:
      signature.contract.status === 'ativo'
        ? 'Assinado'
        : contractStatusLabel[signature.contract.status],
    version: signature.contractVersion,
    documentHash: signature.documentHash,
    validationCode: signature.validationCode,
  }
}

export async function getSignatureForContract(contractId: string) {
  return prisma.contractSignature.findUnique({
    where: { contractId },
  })
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export { formatShortDate }
