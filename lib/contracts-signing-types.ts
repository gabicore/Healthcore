import type { ContractStatus } from '@/lib/data'

/** Tipo público compartilhado com a UI de assinatura (sem deps de server). */
export type PublicSigningContract = {
  token: string
  number: string
  status: ContractStatus
  statusLabel: string
  version: number
  studentName: string
  planLabel: string
  startDate: string
  endDate: string
  monthlyValue: number
  monthlyValueLabel: string
  discountPercent: number
  dueDay: number
  paymentMethod: string
  financialResponsible: string
  lateFeePercent: number
  interestPercent: number
  clauses: string[]
  clausesDocument: string
  alreadySigned: boolean
  signedAt?: string
  signerName?: string
  validationCode?: string
  documentHash?: string
  signingUrl: string
}
