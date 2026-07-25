import { PageHeader } from '@/components/page-header'
import { StudentsList } from '@/components/students/students-list'
import { NewStudentDialog } from '@/components/students/new-student-dialog'

export default function AlunosPage() {
  return (
    <>
      <PageHeader title="Alunos" description="Gerencie os alunos do estúdio">
        <NewStudentDialog />
      </PageHeader>
      <div className="p-4 md:p-6">
        <StudentsList />
      </div>
    </>
  )
}
