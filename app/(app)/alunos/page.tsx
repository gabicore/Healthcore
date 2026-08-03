import Link from 'next/link'
import { UserPlus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StudentsList } from '@/components/students/students-list'
import { Button } from '@/components/ui/button'

export default function AlunosPage() {
  return (
    <>
      <PageHeader title="Alunos" description="Gerencie os alunos do estúdio">
        <Button size="sm" nativeButton={false} render={<Link href="/alunos/novo" />}>
          <UserPlus data-icon="inline-start" />
          Novo aluno
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <StudentsList />
      </div>
    </>
  )
}
