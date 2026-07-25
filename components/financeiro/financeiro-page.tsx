'use client'

import { useMemo, useState } from 'react'
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
  activeStudentsCount,
  createExpense,
  expenseCategoryLabel,
  expenses,
  expensesByCategory,
  expectedStudentRevenue,
  formatCurrency,
  monthlyRevenue,
  openPayments,
  overduePayments,
  paidExpensesTotal,
  patchExpense,
  pendingExpensesTotal,
  removeExpense,
  revenueByMonth,
  setExpenseStatus,
  totalExpenses,
  type ExpenseCategory,
  type ExpenseStatus,
} from '@/lib/data'
import { cn } from '@/lib/utils'

const categoryOptions = (
  Object.entries(expenseCategoryLabel) as [ExpenseCategory, string][]
).map(([value, label]) => ({ value, label }))

const statusOptions = [
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
]

const revenueConfig = {
  receita: { label: 'Receita alunos', color: 'var(--chart-1)' },
} satisfies ChartConfig

const expenseChartConfig = {
  amount: { label: 'Valor', color: 'var(--chart-4)' },
} satisfies ChartConfig

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

export function FinanceiroPage() {
  const today = useMemo(() => new Date(), [])
  const [version, setVersion] = useState(0)

  const monthLabel = today.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const studentRevenue = useMemo(() => {
    void version
    return monthlyRevenue(today.getFullYear(), today.getMonth() + 1)
  }, [version, today])

  const expectedRevenue = useMemo(() => expectedStudentRevenue(), [])
  const activeCount = useMemo(() => activeStudentsCount(), [])

  const expenseList = useMemo(() => {
    void version
    return [...expenses].sort((a, b) => a.dueDay - b.dueDay)
  }, [version])

  const expensesTotal = useMemo(() => {
    void version
    return totalExpenses()
  }, [version])

  const expensesPaid = useMemo(() => {
    void version
    return paidExpensesTotal()
  }, [version])

  const expensesPending = useMemo(() => {
    void version
    return pendingExpensesTotal()
  }, [version])

  const byCategory = useMemo(() => {
    void version
    return expensesByCategory()
  }, [version])

  const openReceivables = useMemo(() => {
    void version
    return openPayments()
  }, [version])

  const overdue = useMemo(() => {
    void version
    return overduePayments()
  }, [version])

  const chartData = useMemo(() => {
    void version
    return revenueByMonth(6, today)
  }, [version, today])

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

  function refresh() {
    setVersion((v) => v + 1)
  }

  function handleExpenseStatus(id: string, status: ExpenseStatus, name: string) {
    const updated = setExpenseStatus(id, status)
    if (!updated) {
      toast.error('Não foi possível atualizar a conta')
      return
    }
    refresh()
    toast.success(
      status === 'pago' ? 'Conta marcada como paga' : 'Conta reaberta',
      { description: name },
    )
  }

  function handleExpensePatch(
    id: string,
    patch: Parameters<typeof patchExpense>[1],
    label: string,
  ) {
    const updated = patchExpense(id, patch)
    if (!updated) {
      toast.error('Não foi possível atualizar')
      return
    }
    refresh()
    toast.success(`${label} atualizado`, {
      description:
        'A alteração será salva quando o banco de dados for conectado.',
      duration: 1800,
    })
  }

  function handleAddExpense() {
    const expense = createExpense({
      name: 'Nova conta',
      category: 'outros',
      amount: 0,
      dueDay: 1,
      status: 'pendente',
      recurring: true,
    })
    refresh()
    toast.success('Conta adicionada', {
      description: 'Clique nos campos para editar os detalhes.',
    })
    return expense
  }

  function handleRemoveExpense(id: string, name: string) {
    const ok = removeExpense(id)
    if (!ok) {
      toast.error('Não foi possível remover a conta')
      return
    }
    refresh()
    toast.success('Conta removida', { description: name })
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Entradas dos alunos, gastos fixos e contas do estúdio"
      >
        <Button size="sm" nativeButton={false} render={<Link href="/alunos" />}>
          <Users data-icon="inline-start" />
          Cobranças por aluno
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Entrada dos alunos"
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
            title="A receber (alunos)"
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
                Mensalidades dos {activeCount} alunos ativos
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
                Detalhes de cobrança por aluno ficam no perfil de cada aluno ou
                na lista de alunos.
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
            <Button type="button" size="sm" onClick={handleAddExpense}>
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
                    Nenhuma conta cadastrada.{' '}
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                      onClick={handleAddExpense}
                    >
                      Adicionar a primeira
                    </button>
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
                            handleExpensePatch(
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
                            handleExpensePatch(
                              expense.id,
                              { notes: notes || undefined },
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
                          handleExpensePatch(
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
                          handleExpensePatch(
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
                          handleExpensePatch(expense.id, { amount }, 'Valor')
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
                          handleExpenseStatus(
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
                          handleRemoveExpense(expense.id, expense.name)
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
            <CardTitle>Receita de alunos (últimos meses)</CardTitle>
            <CardDescription>
              Valores recebidos das mensalidades — sem detalhar por aluno
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
