'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/page-header'
import { PersonalDataPanel } from '@/components/students/personal-data-panel'
import { Button } from '@/components/ui/button'
import { createStudent } from '@/lib/students-api'

export function NewStudentView() {
  const router = useRouter()

  return (
    <>
      <PageHeader
        title="Nova pessoa"
        description="Preencha os dados pessoais para cadastrar"
      >
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/alunos" />}
        >
          Voltar
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <PersonalDataPanel
          mode="create"
          onCancelCreate={() => router.push('/alunos')}
          onCreate={async (input) => {
            const created = await createStudent(input)
            router.push(`/alunos/${created.id}`)
            router.refresh()
            return created
          }}
        />
      </div>
    </>
  )
}
