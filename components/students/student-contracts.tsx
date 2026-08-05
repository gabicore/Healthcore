'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type Contract,
  type ContractStatus,
  type Student,
  contractStatusLabel,
  formatShortDate,
} from '@/lib/data'
import { fetchStudentContracts } from '@/lib/contracts-api'
import { cn } from '@/lib/utils'

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const styles: Record<ContractStatus, string> = {
    rascunho: 'border-transparent bg-muted text-muted-foreground',
    pendente_assinatura: 'border-transparent bg-chart-3/20 text-chart-3',
    ativo: 'border-transparent bg-primary/12 text-primary',
    encerrado: 'border-transparent bg-accent text-accent-foreground',
    cancelado: 'border-transparent bg-destructive/12 text-destructive',
  }
  return (
    <Badge variant="outline" className={cn(styles[status])}>
      {contractStatusLabel[status]}
    </Badge>
  )
}

type StudentContractsPanelProps = {
  student: Student
  onContractsChanged?: () => void
}

export function StudentContractsPanel({
  student,
}: StudentContractsPanelProps) {
  const router = useRouter()
  const [list, setList] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchStudentContracts(student.id)
      .then((data) => {
        if (!cancelled) setList(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar os contratos',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student.id])

  const activeContract = useMemo(
    () => list.find((c) => c.status === 'ativo') ?? null,
    [list],
  )

  function openContract(contractId: string) {
    router.push(`/alunos/${student.id}/contratos/${contractId}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-end space-y-0">
        {activeContract ? (
          <Button
            size="sm"
            disabled
            title="Encerre ou rescinda o contrato ativo para criar outro"
          >
            <Plus data-icon="inline-start" />
            Novo contrato
          </Button>
        ) : (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/alunos/${student.id}/contratos/novo`} />}
          >
            <Plus data-icon="inline-start" />
            Novo contrato
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {activeContract ? (
          <p className="mb-4 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Já existe um contrato ativo ({activeContract.number}). Para criar
            um novo, encerre ou rescinda o atual.
          </p>
        ) : null}
        {loading ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>Carregando contratos…</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : list.length === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyHeader className="max-w-none text-center">
              <EmptyMedia variant="icon">
                <FileText className="size-6" />
              </EmptyMedia>
              <EmptyTitle className="text-center">Nenhum contrato</EmptyTitle>
              <EmptyDescription className="whitespace-nowrap text-center">
                Crie o primeiro contrato desta pessoa para começar.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Contrato</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((contract) => (
                <TableRow
                  key={contract.id}
                  className="cursor-pointer"
                  onClick={() => openContract(contract.id)}
                >
                  <TableCell className="font-medium tabular-nums">
                    {contract.number}
                  </TableCell>
                  <TableCell>{contract.planLabel}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatShortDate(contract.startDate)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatShortDate(contract.endDate)}
                  </TableCell>
                  <TableCell>
                    <ContractStatusBadge status={contract.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
