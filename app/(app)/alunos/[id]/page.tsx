import { notFound } from 'next/navigation'

import { StudentProfile } from '@/components/students/student-profile'
import { getStudentById } from '@/lib/students-service'

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const student = await getStudentById(id)

  if (!student) {
    notFound()
  }

  return <StudentProfile student={student} />
}
