import { notFound } from 'next/navigation'

import { ContractDetailView } from '@/components/students/contract-detail-view'
import { getContractById } from '@/lib/contracts-service'
import { getStudentById } from '@/lib/students-service'

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>
}) {
  const { id, contractId } = await params
  const [student, contract] = await Promise.all([
    getStudentById(id),
    getContractById(contractId),
  ])

  if (!student || !contract || contract.studentId !== student.id) {
    notFound()
  }

  return (
    <ContractDetailView student={student} initialContract={contract} />
  )
}
