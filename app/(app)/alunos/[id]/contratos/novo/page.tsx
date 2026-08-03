import { notFound } from 'next/navigation'

import { NewContractView } from '@/components/students/new-contract-view'
import { listStudentContracts } from '@/lib/contracts-service'
import { getStudentById } from '@/lib/students-service'

export default async function NovoContratoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const student = await getStudentById(id)

  if (!student) {
    notFound()
  }

  const contracts = await listStudentContracts(id)
  const activeContract = contracts.find((c) => c.status === 'ativo')

  return (
    <NewContractView
      student={student}
      hasActiveContract={Boolean(activeContract)}
      activeContractNumber={activeContract?.number}
    />
  )
}
