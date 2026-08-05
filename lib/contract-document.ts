import { createHash, randomBytes } from 'crypto'

import type { Contract, PaymentMethod } from '@/lib/data'

export type ContractDocumentSnapshot = {
  number: string
  version: number
  studentName: string
  studentCpf: string
  planLabel: string
  startDate: string
  endDate: string
  monthlyValue: number
  discountPercent: number
  dueDay: number
  paymentMethod: PaymentMethod
  financialResponsible: string
  lateFeePercent: number
  interestPercent: number
  clauses: string[]
}

export function clausesToDocument(clauses: string[]) {
  return clauses.join('\n\n').trim()
}

export function buildContractDocumentSnapshot(input: {
  contract: Pick<
    Contract,
    | 'number'
    | 'version'
    | 'planLabel'
    | 'startDate'
    | 'endDate'
    | 'monthlyValue'
    | 'discountPercent'
    | 'dueDay'
    | 'paymentMethod'
    | 'financialResponsible'
    | 'lateFeePercent'
    | 'interestPercent'
    | 'clauses'
  >
  studentName: string
  studentCpf: string
}): ContractDocumentSnapshot {
  return {
    number: input.contract.number,
    version: input.contract.version,
    studentName: input.studentName,
    studentCpf: input.studentCpf,
    planLabel: input.contract.planLabel,
    startDate: input.contract.startDate,
    endDate: input.contract.endDate,
    monthlyValue: input.contract.monthlyValue,
    discountPercent: input.contract.discountPercent,
    dueDay: input.contract.dueDay,
    paymentMethod: input.contract.paymentMethod,
    financialResponsible: input.contract.financialResponsible,
    lateFeePercent: input.contract.lateFeePercent,
    interestPercent: input.contract.interestPercent,
    clauses: [...input.contract.clauses],
  }
}

/** String canônica estável para hash SHA-256. */
export function canonicalizeContractDocument(
  snapshot: ContractDocumentSnapshot,
): string {
  return JSON.stringify({
    number: snapshot.number,
    version: snapshot.version,
    studentName: snapshot.studentName.trim(),
    studentCpf: snapshot.studentCpf.trim(),
    planLabel: snapshot.planLabel.trim(),
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    monthlyValue: Number(snapshot.monthlyValue.toFixed(2)),
    discountPercent: snapshot.discountPercent,
    dueDay: snapshot.dueDay,
    paymentMethod: snapshot.paymentMethod,
    financialResponsible: snapshot.financialResponsible.trim(),
    lateFeePercent: snapshot.lateFeePercent,
    interestPercent: snapshot.interestPercent,
    clauses: clausesToDocument(snapshot.clauses),
  })
}

export function hashContractDocument(snapshot: ContractDocumentSnapshot) {
  return createHash('sha256')
    .update(canonicalizeContractDocument(snapshot), 'utf8')
    .digest('hex')
}

export function generateSigningToken() {
  return randomBytes(32).toString('base64url')
}

export function generateValidationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(10)
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += alphabet[bytes[i]! % alphabet.length]
  }
  return `HC-${code}`
}

export function parseDocumentSnapshot(
  value: unknown,
): ContractDocumentSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Record<string, unknown>
  if (
    typeof s.number !== 'string' ||
    typeof s.version !== 'number' ||
    typeof s.studentName !== 'string' ||
    !Array.isArray(s.clauses)
  ) {
    return null
  }
  return {
    number: s.number,
    version: s.version,
    studentName: s.studentName,
    studentCpf: typeof s.studentCpf === 'string' ? s.studentCpf : '',
    planLabel: typeof s.planLabel === 'string' ? s.planLabel : '',
    startDate: typeof s.startDate === 'string' ? s.startDate : '',
    endDate: typeof s.endDate === 'string' ? s.endDate : '',
    monthlyValue: Number(s.monthlyValue ?? 0),
    discountPercent: Number(s.discountPercent ?? 0),
    dueDay: Number(s.dueDay ?? 1),
    paymentMethod: (typeof s.paymentMethod === 'string'
      ? s.paymentMethod
      : 'PIX') as ContractDocumentSnapshot['paymentMethod'],
    financialResponsible:
      typeof s.financialResponsible === 'string'
        ? s.financialResponsible
        : '',
    lateFeePercent: Number(s.lateFeePercent ?? 0),
    interestPercent: Number(s.interestPercent ?? 0),
    clauses: s.clauses.filter((c): c is string => typeof c === 'string'),
  }
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  )
}

export function signingUrlForToken(token: string) {
  return `${appBaseUrl()}/assinar-contrato/${encodeURIComponent(token)}`
}

export function validationUrlForCode(code: string) {
  return `${appBaseUrl()}/validar-contrato/${encodeURIComponent(code)}`
}
