import { notFound } from 'next/navigation'
import { getStudent } from '@/lib/data'
import { StudentProfile } from '@/components/students/student-profile'

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const student = getStudent(id)

  if (!student) {
    notFound()
  }

  return <StudentProfile student={student} />
}
