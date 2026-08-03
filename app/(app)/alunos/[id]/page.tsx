import { notFound } from 'next/navigation'

import { StudentProfile } from '@/components/students/student-profile'
import { getStudentById } from '@/lib/students-service'

const PROFILE_TABS = new Set([
  'dados',
  'clinico',
  'avaliacoes',
  'evolucao',
  'financeiro',
  'contratos',
  'agenda',
])

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const student = await getStudentById(id)

  if (!student) {
    notFound()
  }

  const initialTab =
    tab && PROFILE_TABS.has(tab) ? tab : 'dados'

  return <StudentProfile student={student} initialTab={initialTab} />
}
