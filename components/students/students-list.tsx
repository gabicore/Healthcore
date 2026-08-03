'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpAZ,
  ChevronRight,
  Search,
  Trash2,
} from 'lucide-react'

import { DeleteStudentDialog } from '@/components/students/delete-student-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { ActiveBadge, PaymentBadge } from '@/components/status-badges'
import {
  initials,
  age,
  nextClass,
  studentPaymentStatus,
  type PaymentStatus,
  type Plan,
  type Student,
} from '@/lib/data'
import { fetchPlans } from '@/lib/settings-api'
import { fetchStudents } from '@/lib/students-api'
import { cn } from '@/lib/utils'

type Filter = 'todos' | 'ativos' | 'inativos'
type SortKey = 'name' | 'plan' | 'nextClass' | 'active' | 'payment'
type SortDir = 'asc' | 'desc'

const paymentRank: Record<PaymentStatus, number> = {
  atrasado: 0,
  pendente: 1,
  pago: 2,
}

function studentPlanLabel(
  student: Student,
  planName: (id: string) => string,
): string {
  if (!student.hasActiveContract) return '—'
  return student.activePlanLabel?.trim() || planName(student.planId)
}

function compareStudents(
  a: Student,
  b: Student,
  key: SortKey,
  planName: (id: string) => string,
): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    case 'plan':
      return studentPlanLabel(a, planName).localeCompare(
        studentPlanLabel(b, planName),
        'pt-BR',
        { sensitivity: 'base' },
      )
    case 'nextClass':
      return nextClass(a).localeCompare(nextClass(b), 'pt-BR', {
        sensitivity: 'base',
      })
    case 'active':
      return Number(b.hasActiveContract) - Number(a.hasActiveContract)
    case 'payment': {
      const rankA = a.hasActiveContract
        ? paymentRank[studentPaymentStatus(a)]
        : 3
      const rankB = b.hasActiveContract
        ? paymentRank[studentPaymentStatus(b)]
        : 3
      return rankA - rankB
    }
  }
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  alpha,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: SortDir
  onSort: (key: SortKey) => void
  className?: string
  alpha?: boolean
}) {
  const active = activeKey === sortKey
  const AscIcon = alpha ? ArrowDownAZ : ArrowDown
  const DescIcon = alpha ? ArrowUpAZ : ArrowUp

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 -mx-1',
          'font-medium transition-colors hover:bg-muted/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
          active && 'text-foreground',
        )}
        title={
          active
            ? direction === 'asc'
              ? 'Crescente · clique para inverter'
              : 'Decrescente · clique para inverter'
            : `Ordenar por ${label}`
        }
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        {active ? (
          direction === 'asc' ? (
            <AscIcon className="size-3.5 text-muted-foreground" />
          ) : (
            <DescIcon className="size-3.5 text-muted-foreground" />
          )
        ) : (
          <AscIcon className="size-3.5 text-muted-foreground/40" />
        )}
      </button>
    </TableHead>
  )
}

export function StudentsList() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const planName = useMemo(() => {
    const map = new Map(plans.map((p) => [p.id, p.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [plans])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchStudents(), fetchPlans()])
      .then(([studentData, planData]) => {
        if (!cancelled) {
          setStudents(studentData)
          setPlans(planData)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar os alunos',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const list = students.filter((s) => {
      const matchesQuery =
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.email.toLowerCase().includes(query.toLowerCase())
      const matchesFilter =
        filter === 'todos' ||
        (filter === 'ativos' && s.hasActiveContract) ||
        (filter === 'inativos' && !s.hasActiveContract)
      return matchesQuery && matchesFilter
    })

    return list.sort((a, b) => {
      const result = compareStudents(a, b, sortKey, planName)
      if (result !== 0) return sortDir === 'asc' ? result : -result
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    })
  }, [students, query, filter, sortKey, sortDir, planName])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Buscar por nome ou e-mail"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
        <ToggleGroup
          value={[filter]}
          onValueChange={(value) => {
            const next = value[0] as Filter | undefined
            if (next) setFilter(next)
          }}
          variant="outline"
          className="w-fit"
        >
          <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
          <ToggleGroupItem value="ativos">Ativos</ToggleGroupItem>
          <ToggleGroupItem value="inativos">Inativos</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className="overflow-hidden py-0">
        {loading ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>Carregando alunos…</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : error ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>Erro ao carregar</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    label="Aluno"
                    sortKey="name"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    alpha
                  />
                  <SortableHead
                    label="Plano"
                    sortKey="plan"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    className="hidden md:table-cell"
                    alpha
                  />
                  <SortableHead
                    label="Próxima aula"
                    sortKey="nextClass"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    className="hidden lg:table-cell"
                  />
                  <SortableHead
                    label="Situação"
                    sortKey="active"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Financeiro"
                    sortKey="payment"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow
                    key={s.id}
                    onClick={() => router.push(`/alunos/${s.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs">
                            {initials(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {age(s.birthDate)} anos · {s.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {studentPlanLabel(s, planName)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {s.hasActiveContract ? nextClass(s) : '—'}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={s.hasActiveContract} />
                    </TableCell>
                    <TableCell>
                      {s.hasActiveContract ? (
                        <PaymentBadge status={studentPaymentStatus(s)} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          title="Excluir aluno"
                          aria-label={`Excluir ${s.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget({ id: s.id, name: s.name })
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 ? (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyTitle>Nenhum aluno encontrado</EmptyTitle>
                  <EmptyDescription>
                    Ajuste a busca ou os filtros para ver resultados.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
          </>
        )}
      </Card>

      <DeleteStudentDialog
        open={Boolean(deleteTarget)}
        studentId={deleteTarget?.id ?? ''}
        studentName={deleteTarget?.name ?? ''}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onDeleted={() => {
          const id = deleteTarget?.id
          if (id) setStudents((prev) => prev.filter((s) => s.id !== id))
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
