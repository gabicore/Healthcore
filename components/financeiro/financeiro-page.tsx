'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Building2,
  Plus,
  Receipt,
  Trash2,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { InlineCell } from '@/components/financeiro/inline-cell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  expenseCategoryLabel,
  formatCurrency,
  toIsoDate,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type Student,
} from '@/lib/data'
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  updateExpense,
} from '@/lib/expenses-api'
import { fetchStudents } from '@/lib/students-api'
import type { UpdateExpenseInput } from '@/lib/validations/expense'
import { cn } from '@/lib/utils'

const categoryOptions = (
  Object.entries(expenseCategoryLabel) as [ExpenseCategory, string][]
).map(([value, label]) => ({ value, label }))

const statusOptions = [
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
]

const revenueConfig = {
  receita: { label: 'Receita pessoas', color: 'var(--chart-1)' },
} satisfies ChartConfig

const expenseChartConfig = {
  amount: { label: 'Valor', color: 'var(--chart-4)' },
} satisfies ChartConfig

const shortMonthLabels = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const

function allPaymentRows(students: Student[]) {
  return students.flatMap((student) =>
    student.payments.map((payment) => ({ student, payment })),
  )
}

function monthlyRevenueFrom(
  students: Student[],
  year: number,
  month: number,
) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return allPaymentRows(students)
    .filter(
      (row) =>
        row.payment.status === 'pago' &&
        row.payment.paidAt?.startsWith(prefix),
    )
    .reduce((sum, row) => sum + row.payment.amount, 0)
}

function revenueByMonthFrom(
  students: Student[],
  monthsBack = 6,
  today = new Date(),
) {
  const points: { month: string; receita: number; key: string }[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    points.push({
      month: shortMonthLabels[d.getMonth()],
      receita: monthlyRevenueFrom(students, year, month),
      key: `${year}-${String(month).padStart(2, '0')}`,
    })
  }
  return points
}

function expensesByCategoryFrom(expenseList: Expense[]) {
  const map = new Map<ExpenseCategory, number>()
  for (const expense of expenseList) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount)
  }
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      label: expenseCategoryLabel[category],
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent,
  positive,
}: {
  title: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  accent?: boolean
  positive?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span
            className={cn(
              'text-2xl font-semibold tracking-tight',
              accent && 'text-destructive',
              positive && 'text-primary',
            )}
          >
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-lg',
            accent
              ? 'bg-destructive/10 text-destructive'
              : 'bg-accent text-accent-foreground',
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

const SHOW_FINANCEIRO_CONTENT = false

export function FinanceiroPage() {
  if (!SHOW_FINANCEIRO_CONTENT) {
    return (
      <>
        <PageHeader
          title="Financeiro"
          description="Entradas das pessoas, gastos fixos e contas do estúdio"
        />
        <div className="p-4 md:p-6">
          <p className="text-sm text-muted-foreground">
            Conteúdo temporariamente oculto.
          </p>
        </div>
      </>
    )
  }

  return <FinanceiroPageContent />
}

function FinanceiroPageContent() {
  const today = useMemo(() => new Date(), [])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchExpenses(), fetchStudents()])
      .then(([expenseData, studentData]) => {
        if (cancelled) return
        setExpenses(expenseData)
        setStudents(studentData)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        toast.error(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar o financeiro',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const monthLabel = today.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const studentRevenue = useMemo(
    () => monthlyRevenueFrom(students, today.getFullYear(), today.getMonth() + 1),
    [students, today],
  )

  const expectedRevenue = useMemo(
    () =>
      students
        .filter((s) => s.active)
        .reduce((sum, s) => sum + s.monthlyValue, 0),
    [students],
  )

  const activeCount = useMemo(
    () => students.filter((s) => s.active).length,
    [students],
  )

  const expenseList = useMemo(
    () => [...expenses].sort((a, b) => a.dueDay - b.dueDay),
    [expenses],
  )

  const expensesTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  )

  const expensesPaid = useMemo(
    () =>
      expenses
        .filter((e) => e.status === 'pago')
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  )

  const expensesPending = useMemo(
    () =>
      expenses
        .filter((e) => e.status === 'pendente')
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  )

  const byCategory = useMemo(
    () => expensesByCategoryFrom(expenses),
    [expenses],
  )

  const openReceivables = useMemo(
    () =>
      allPaymentRows(students).filter(
        (row) =>
          row.payment.status === 'pendente' ||
          row.payment.status === 'atrasado',
      ),
    [students],
  )

  const overdue = useMemo(
    () =>
      allPaymentRows(students).filter(
        (row) => row.payment.status === 'atrasado',
      ),
    [students],
  )

  const chartData = useMemo(
    () => revenueByMonthFrom(students, 6, today),
    [students, today],
  )

  const openTotal = openReceivables.reduce(
    (sum, row) => sum + row.payment.amount,
    0,
  )
  const overdueTotal = overdue.reduce(
    (sum, row) => sum + row.payment.amount,
    0,
  )
  const balance = studentRevenue - expensesPaid
  const projectedBalance = expectedRevenue - expensesTotal

  async function handleExpenseStatus(
    id: string,
    status: ExpenseStatus,
    name: string,
  ) {
    try {
      const updated = await updateExpense(
        id,
        status === 'pago'
          ? { status: 'pago', paidAt: toIsoDate(new Date()) }
          : { status: 'pendente', paidAt: null },
      )
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)))
      toast.success(
        status === 'pago' ? 'Conta marcada como paga' : 'Conta reaberta',
        { description: name },
      )
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar a conta',
      )
    }
  }

  async function handleExpensePatch(
    id: string,
    patch: UpdateExpenseInput,
    label: string,
  ) {
    try {
      const updated = await updateExpense(id, patch)
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)))
      toast.success(`${label} atualizado`, { duration: 1800 })
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Não foi possível atualizar',
      )
    }
  }

  async function handleAddExpense() {
    try {
      const expense = await createExpense({
        name: 'Nova conta',
        category: 'outros',
        amount: 0,
        dueDay: 1,
        status: 'pendente',
        recurring: true,
      })
      setExpenses((prev) => [...prev, expense])
      toast.success('Conta adicionada', {
        description: 'Clique nos campos para editar os detalhes.',
      })
      return expense
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível adicionar a conta',
      )
      return null
    }
  }

  async function handleRemoveExpense(id: string, name: string) {
    try {
      await deleteExpense(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      toast.success('Conta removida', { description: name })
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível remover a conta',
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Entradas das pessoas, gastos fixos e contas do estúdio"
      >
        <Button size="sm" nativeButton={false} render={<Link href="/alunos" />}>
          <Users data-icon="inline-start" />
          Cobranças por pessoa
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando financeiro…</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Entrada das pessoas"
            value={formatCurrency(studentRevenue)}
            hint={`Recebido em ${monthLabel}`}
            icon={Wallet}
            positive
          />
          <StatCard
            title="Gastos do mês"
            value={formatCurrency(expensesTotal)}
            hint={`${formatCurrency(expensesPending)} ainda em aberto`}
            icon={Receipt}
          />
          <StatCard
            title="Saldo do mês"
            value={formatCurrency(balance)}
            hint={`Entradas − contas já pagas`}
            icon={Building2}
            positive={balance >= 0}
            accent={balance < 0}
          />
          <StatCard
            title="A receber (pessoas)"
            value={formatCurrency(openTotal)}
            hint={`${overdue.length} cobrança(s) em atraso · ${formatCurrency(overdueTotal)}`}
            icon={TriangleAlert}
            accent={overdueTotal > 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Entrada prevista × realizada</CardTitle>
              <CardDescription>
                Mensalidades das {activeCount} pessoas ativas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Prevista</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatCurrency(expectedRevenue)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Recebida</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
                    {formatCurrency(studentRevenue)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Saldo projetado (prevista − gastos fixos)
                </p>
                <p
                  className={cn(
                    'mt-1 text-xl font-semibold tabular-nums',
                    projectedBalance >= 0 ? 'text-primary' : 'text-destructive',
                  )}
                >
                  {formatCurrency(projectedBalance)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Detalhes de cobrança por pessoa ficam no perfil de cada pessoa ou
                na lista de pessoas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gastos por categoria</CardTitle>
              <CardDescription>Aluguel, contas e demais fixos</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={expenseChartConfig}
                className="h-[220px] w-full"
              >
                <BarChart
                  data={byCategory}
                  layout="vertical"
                  margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={88}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          Number(value).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }),
                          ' ',
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--color-amount)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden py-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-4">
            <div>
              <CardTitle className="text-base">Gastos fixos e contas</CardTitle>
              <CardDescription>
                Clique para editar · adicione ou remova contas do mês
              </CardDescription>
            </div>
            <Button type="button" size="sm" onClick={() => void handleAddExpense()}>
              <Plus data-icon="inline-start" />
              Adicionar conta
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Categoria
                </TableHead>
                <TableHead className="hidden md:table-cell">Venc.</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {loading ? (
                      'Carregando contas…'
                    ) : (
                      <>
                        Nenhuma conta cadastrada.{' '}
                        <button
                          type="button"
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                          onClick={() => void handleAddExpense()}
                        >
                          Adicionar a primeira
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                expenseList.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="min-w-[200px]">
                      <div className="flex flex-col gap-0.5">
                        <InlineCell
                          value={expense.name}
                          className="font-medium"
                          onSave={(name) => {
                            if (!name) return
                            void handleExpensePatch(
                              expense.id,
                              { name },
                              'Descrição',
                            )
                          }}
                        />
                        <InlineCell
                          value={expense.notes ?? ''}
                          emptyLabel="Observação"
                          className="text-xs text-muted-foreground"
                          onSave={(notes) =>
                            void handleExpensePatch(
                              expense.id,
                              { notes: notes || null },
                              'Observação',
                            )
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <InlineCell
                        type="select"
                        value={expense.category}
                        displayValue={expenseCategoryLabel[expense.category]}
                        options={categoryOptions}
                        onSave={(category) =>
                          void handleExpensePatch(
                            expense.id,
                            { category: category as ExpenseCategory },
                            'Categoria',
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <InlineCell
                        type="number"
                        value={String(expense.dueDay)}
                        displayValue={`Dia ${expense.dueDay}`}
                        onSave={(raw) => {
                          const dueDay = Math.min(
                            28,
                            Math.max(1, Number(raw) || 1),
                          )
                          void handleExpensePatch(
                            expense.id,
                            { dueDay },
                            'Vencimento',
                          )
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineCell
                        type="number"
                        value={String(expense.amount)}
                        displayValue={formatCurrency(expense.amount)}
                        className="font-medium tabular-nums"
                        onSave={(raw) => {
                          const amount = Math.max(0, Number(raw) || 0)
                          void handleExpensePatch(
                            expense.id,
                            { amount },
                            'Valor',
                          )
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineCell
                        type="select"
                        value={expense.status}
                        displayValue={
                          expense.status === 'pago' ? 'Pago' : 'Pendente'
                        }
                        options={statusOptions}
                        className={cn(
                          'font-medium',
                          expense.status === 'pago'
                            ? 'text-primary'
                            : 'text-chart-3',
                        )}
                        onSave={(status) =>
                          void handleExpenseStatus(
                            expense.id,
                            status as ExpenseStatus,
                            expense.name,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Excluir ${expense.name}`}
                        onClick={() =>
                          void handleRemoveExpense(expense.id, expense.name)
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Pago {formatCurrency(expensesPaid)} · Pendente{' '}
              {formatCurrency(expensesPending)}
            </span>
            <span className="font-semibold tabular-nums">
              Total {formatCurrency(expensesTotal)}
            </span>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita de pessoas (últimos meses)</CardTitle>
            <CardDescription>
              Valores recebidos das mensalidades — sem detalhar por pessoa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={revenueConfig}
              className="h-[220px] w-full"
            >
              <AreaChart
                data={chartData}
                margin={{ left: 4, right: 8, top: 8 }}
              >
                <defs>
                  <linearGradient
                    id="fillReceitaFinanceiro"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-receita)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-receita)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={52}
                  tickFormatter={(v) =>
                    v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                  }
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [
                        Number(value).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }),
                        ' Receita',
                      ]}
                    />
                  }
                />
                <Area
                  dataKey="receita"
                  type="monotone"
                  fill="url(#fillReceitaFinanceiro)"
                  stroke="var(--color-receita)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
