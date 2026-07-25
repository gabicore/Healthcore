'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  FileText,
  History,
  Mail,
  Pencil,
  PenLine,
  Printer,
  RefreshCw,
  ScrollText,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  type PaymentMethod,
  type Student,
  contractStatusLabel,
  formatCurrency,
  formatShortDate,
  getStudentContracts,
  patchContract,
  paymentMethods,
  plans,
  planPeriodLabel,
  removeContract,
  renewContract,
  rescindContract,
  sendContractForSignature,
} from '@/lib/data'
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

function DetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  )
}

type EditForm = {
  planId: string
  planLabel: string
  startDate: string
  endDate: string
  status: ContractStatus
  monthlyValue: number
  discountPercent: number
  discountNote: string
  dueDay: number
  paymentMethod: PaymentMethod
  financialResponsible: string
  lateFeePercent: number
  interestPercent: number
}

function toEditForm(contract: Contract): EditForm {
  return {
    planId: contract.planId,
    planLabel: contract.planLabel,
    startDate: contract.startDate,
    endDate: contract.endDate,
    status: contract.status,
    monthlyValue: contract.monthlyValue,
    discountPercent: contract.discountPercent,
    discountNote: contract.discountNote ?? '',
    dueDay: contract.dueDay,
    paymentMethod: contract.paymentMethod,
    financialResponsible: contract.financialResponsible,
    lateFeePercent: contract.lateFeePercent,
    interestPercent: contract.interestPercent,
  }
}

const statusOptions = (
  Object.entries(contractStatusLabel) as [ContractStatus, string][]
).map(([value, label]) => ({ value, label }))

type StudentContractsPanelProps = {
  student: Student
}

export function StudentContractsPanel({ student }: StudentContractsPanelProps) {
  const [tick, setTick] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)

  const list = useMemo(() => {
    void tick
    return getStudentContracts(student.id)
  }, [student.id, tick])

  const selected = useMemo(() => {
    void tick
    return list.find((c) => c.id === selectedId) ?? null
  }, [list, selectedId, tick])

  useEffect(() => {
    if (!selected) {
      setEditing(false)
      setForm(null)
      return
    }
    if (!editing) setForm(toEditForm(selected))
  }, [selected, editing])

  function refresh() {
    setTick((n) => n + 1)
  }

  function notify(title: string, description?: string) {
    toast.success(title, {
      description:
        description ??
        'A alteração será salva quando o banco de dados for conectado.',
    })
    refresh()
  }

  function updateForm<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handlePlanChange(planId: string) {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || !form) return
    setForm({
      ...form,
      planId,
      planLabel: `${planPeriodLabel[plan.period]} · ${plan.frequencyLabel}`,
      monthlyValue:
        form.discountPercent > 0
          ? Math.round(plan.price * (1 - form.discountPercent / 100) * 100) /
            100
          : plan.price,
    })
  }

  function handleSaveEdit() {
    if (!selected || !form) return
    const next = patchContract(
      selected.id,
      {
        planId: form.planId,
        planLabel: form.planLabel,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        monthlyValue: Math.max(0, form.monthlyValue),
        discountPercent: Math.min(100, Math.max(0, form.discountPercent)),
        discountNote: form.discountNote.trim() || undefined,
        dueDay: Math.min(28, Math.max(1, form.dueDay)),
        paymentMethod: form.paymentMethod,
        financialResponsible: form.financialResponsible.trim(),
        lateFeePercent: Math.max(0, form.lateFeePercent),
        interestPercent: Math.max(0, form.interestPercent),
        version: selected.version + 1,
        previousVersions: [
          {
            version: selected.version,
            changedAt: selected.updatedAt,
            summary: 'Edição manual dos dados do contrato',
          },
          ...selected.previousVersions,
        ],
      },
      'Contrato editado',
    )
    if (!next) {
      toast.error('Não foi possível salvar o contrato')
      return
    }
    setEditing(false)
    notify('Contrato atualizado', next.number)
  }

  function handleDelete(contract: Contract) {
    const ok = window.confirm(
      `Apagar o contrato ${contract.number}? Esta ação não pode ser desfeita.`,
    )
    if (!ok) return
    const removed = removeContract(contract.id)
    if (!removed) {
      toast.error('Não foi possível apagar o contrato')
      return
    }
    setSelectedId(null)
    setEditing(false)
    notify('Contrato apagado', contract.number)
  }

  function handleSendSignature(contract: Contract) {
    const next = sendContractForSignature(contract.id)
    if (!next) {
      toast.error('Não foi possível enviar o contrato')
      return
    }
    notify(
      'Enviado para assinatura',
      `${next.number} · ${student.email || 'sem e-mail'}`,
    )
  }

  function handleRenew(contract: Contract) {
    const next = renewContract(contract.id)
    if (!next) {
      toast.error('Não foi possível renovar o contrato')
      return
    }
    setSelectedId(next.id)
    setEditing(false)
    notify('Contrato renovado', `Novo rascunho ${next.number}`)
  }

  function handleRescind(contract: Contract) {
    const next = rescindContract(contract.id)
    if (!next) {
      toast.error('Não foi possível rescindir o contrato')
      return
    }
    notify('Contrato rescindido', next.number)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
          <CardDescription>
            Clique em um contrato para ver, editar ou apagar · histórico de{' '}
            {student.name.split(' ')[0]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <Empty className="border-0 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>Nenhum contrato</EmptyTitle>
                <EmptyDescription>
                  Os contratos deste aluno aparecerão aqui.
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
                    onClick={() => {
                      setEditing(false)
                      setSelectedId(contract.id)
                    }}
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

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
            setEditing(false)
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-lg"
        >
          {selected ? (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  Contrato {selected.number}
                  <ContractStatusBadge status={selected.status} />
                </SheetTitle>
                <SheetDescription>
                  Versão {selected.version} · atualizado em{' '}
                  {formatShortDate(selected.updatedAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap gap-2">
                  {!editing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm(toEditForm(selected))
                          setEditing(true)
                        }}
                      >
                        <Pencil data-icon="inline-start" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(selected)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Apagar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          notify(
                            'Visualização do contrato',
                            `${selected.number} aberto (prévia)`,
                          )
                        }
                      >
                        <Eye data-icon="inline-start" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          notify('PDF gerado', `${selected.number}.pdf`)
                        }
                      >
                        <Printer data-icon="inline-start" />
                        Gerar PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          selected.status === 'ativo' ||
                          selected.status === 'encerrado' ||
                          selected.status === 'cancelado'
                        }
                        onClick={() => handleSendSignature(selected)}
                      >
                        <PenLine data-icon="inline-start" />
                        Enviar assinatura
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          notify(
                            'Enviado por e-mail',
                            student.email || 'Aluno sem e-mail cadastrado',
                          )
                        }
                      >
                        <Mail data-icon="inline-start" />
                        Enviar e-mail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          selected.status === 'cancelado' ||
                          selected.status === 'rascunho'
                        }
                        onClick={() => handleRenew(selected)}
                      >
                        <RefreshCw data-icon="inline-start" />
                        Renovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={
                          selected.status === 'cancelado' ||
                          selected.status === 'encerrado'
                        }
                        onClick={() => handleRescind(selected)}
                      >
                        <XCircle data-icon="inline-start" />
                        Rescindir
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={handleSaveEdit}>
                        Salvar alterações
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm(toEditForm(selected))
                          setEditing(false)
                        }}
                      >
                        Cancelar edição
                      </Button>
                    </>
                  )}
                </div>

                <section>
                  <h3 className="mb-1 text-sm font-medium">Dados do aluno</h3>
                  <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                    <DetailItem label="Nome" value={student.name} />
                    <DetailItem label="CPF" value={student.cpf} />
                    <DetailItem label="E-mail" value={student.email} />
                    <DetailItem label="Telefone" value={student.phone} />
                  </dl>
                </section>

                <Separator />

                {editing && form ? (
                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium">Editar contrato</h3>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Plano / modalidade</FieldLabel>
                        <Select
                          value={form.planId}
                          onValueChange={(v) => {
                            if (v) handlePlanChange(v)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {plans.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {planPeriodLabel[p.period]} ·{' '}
                                  {p.frequencyLabel} —{' '}
                                  {formatCurrency(p.price)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>Situação</FieldLabel>
                        <Select
                          value={form.status}
                          onValueChange={(v) =>
                            updateForm(
                              'status',
                              (v as ContractStatus) ?? form.status,
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="c-responsible">
                          Responsável financeiro
                        </FieldLabel>
                        <Input
                          id="c-responsible"
                          value={form.financialResponsible}
                          onChange={(e) =>
                            updateForm(
                              'financialResponsible',
                              e.target.value,
                            )
                          }
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="c-start">Início</FieldLabel>
                          <Input
                            id="c-start"
                            type="date"
                            value={form.startDate}
                            onChange={(e) =>
                              updateForm('startDate', e.target.value)
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-end">Término</FieldLabel>
                          <Input
                            id="c-end"
                            type="date"
                            value={form.endDate}
                            onChange={(e) =>
                              updateForm('endDate', e.target.value)
                            }
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="c-value">
                            Valor mensalidade
                          </FieldLabel>
                          <Input
                            id="c-value"
                            type="number"
                            min={0}
                            step={10}
                            value={form.monthlyValue}
                            onChange={(e) =>
                              updateForm(
                                'monthlyValue',
                                Number(e.target.value) || 0,
                              )
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-due">
                            Dia vencimento
                          </FieldLabel>
                          <Input
                            id="c-due"
                            type="number"
                            min={1}
                            max={28}
                            value={form.dueDay}
                            onChange={(e) =>
                              updateForm(
                                'dueDay',
                                Math.min(
                                  28,
                                  Math.max(1, Number(e.target.value) || 1),
                                ),
                              )
                            }
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="c-discount">
                            Desconto (%)
                          </FieldLabel>
                          <Input
                            id="c-discount"
                            type="number"
                            min={0}
                            max={100}
                            value={form.discountPercent}
                            onChange={(e) =>
                              updateForm(
                                'discountPercent',
                                Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value) || 0),
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-discount-note">
                            Bolsa / observação
                          </FieldLabel>
                          <Input
                            id="c-discount-note"
                            value={form.discountNote}
                            onChange={(e) =>
                              updateForm('discountNote', e.target.value)
                            }
                            placeholder="Opcional"
                          />
                        </Field>
                      </div>
                      <Field>
                        <FieldLabel>Forma de pagamento</FieldLabel>
                        <Select
                          value={form.paymentMethod}
                          onValueChange={(v) =>
                            updateForm(
                              'paymentMethod',
                              (v as PaymentMethod) ?? form.paymentMethod,
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {paymentMethods.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="c-late">Multa (%)</FieldLabel>
                          <Input
                            id="c-late"
                            type="number"
                            min={0}
                            value={form.lateFeePercent}
                            onChange={(e) =>
                              updateForm(
                                'lateFeePercent',
                                Math.max(0, Number(e.target.value) || 0),
                              )
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-interest">
                            Juros (% a.m.)
                          </FieldLabel>
                          <Input
                            id="c-interest"
                            type="number"
                            min={0}
                            value={form.interestPercent}
                            onChange={(e) =>
                              updateForm(
                                'interestPercent',
                                Math.max(0, Number(e.target.value) || 0),
                              )
                            }
                          />
                        </Field>
                      </div>
                    </FieldGroup>
                  </section>
                ) : (
                  <section>
                    <h3 className="mb-1 text-sm font-medium">Contrato</h3>
                    <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      <DetailItem
                        label="Responsável financeiro"
                        value={selected.financialResponsible}
                      />
                      <DetailItem
                        label="Plano / modalidade"
                        value={selected.planLabel}
                      />
                      <DetailItem
                        label="Valor da mensalidade"
                        value={formatCurrency(selected.monthlyValue)}
                      />
                      <DetailItem
                        label="Dia de vencimento"
                        value={`Dia ${selected.dueDay}`}
                      />
                      <DetailItem
                        label="Vigência"
                        value={`${formatShortDate(selected.startDate)} — ${formatShortDate(selected.endDate)}`}
                      />
                      <DetailItem
                        label="Forma de pagamento"
                        value={selected.paymentMethod}
                      />
                      <DetailItem
                        label="Descontos e bolsas"
                        value={
                          selected.discountPercent > 0
                            ? `${selected.discountPercent}%${
                                selected.discountNote
                                  ? ` · ${selected.discountNote}`
                                  : ''
                              }`
                            : 'Sem desconto'
                        }
                      />
                      <DetailItem
                        label="Multa e juros"
                        value={`Multa ${selected.lateFeePercent}% · juros ${selected.interestPercent}% a.m.`}
                      />
                      <DetailItem
                        label="Assinatura digital"
                        value={
                          selected.signedAt
                            ? `${selected.signatureName ?? 'Assinado'} · ${formatShortDate(selected.signedAt)}`
                            : 'Pendente'
                        }
                      />
                      <DetailItem
                        label="Situação"
                        value={
                          <ContractStatusBadge status={selected.status} />
                        }
                      />
                    </dl>
                  </section>
                )}

                {!editing ? (
                  <>
                    <Separator />

                    <section className="flex flex-col gap-2">
                      <h3 className="flex items-center gap-2 text-sm font-medium">
                        <ScrollText className="size-4 text-muted-foreground" />
                        Cláusulas do contrato
                      </h3>
                      <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                        {selected.clauses.map((clause, i) => (
                          <li key={i}>{clause}</li>
                        ))}
                      </ol>
                    </section>

                    <Separator />

                    <section className="flex flex-col gap-2">
                      <h3 className="flex items-center gap-2 text-sm font-medium">
                        <History className="size-4 text-muted-foreground" />
                        Histórico de alterações
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {selected.history.map((entry, i) => (
                          <li
                            key={`${entry.at}-${i}`}
                            className="rounded-md border px-3 py-2"
                          >
                            <p className="text-sm">{entry.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatShortDate(entry.at)} · {entry.by}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {selected.previousVersions.length > 0 ? (
                      <>
                        <Separator />
                        <section className="flex flex-col gap-2">
                          <h3 className="text-sm font-medium">
                            Versões anteriores
                          </h3>
                          <ul className="flex flex-col gap-2">
                            {selected.previousVersions.map((v) => (
                              <li
                                key={v.version}
                                className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    Versão {v.version}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {v.summary}
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                  {formatShortDate(v.changedAt)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
