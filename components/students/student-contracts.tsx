'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Eye,
  FileText,
  History,
  Mail,
  Pencil,
  PenLine,
  Plus,
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
  CardHeader,
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
import { Textarea } from '@/components/ui/textarea'
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
  type Plan,
  type Student,
  contractEndDateForPeriod,
  contractStatusLabel,
  contractTotalClasses,
  defaultContractClauses,
  formatCurrency,
  formatShortDate,
  paymentMethods,
  planPeriodLabel,
  planPeriodMonths,
  studentChargedValue,
  toIsoDate,
  type StudioProfile,
} from '@/lib/data'
import {
  contractAction,
  deleteContract,
  fetchStudentContracts,
  updateContract,
} from '@/lib/contracts-api'
import { fetchPlans, fetchStudio } from '@/lib/settings-api'
import { cn } from '@/lib/utils'

/** Valor de tabela do plano no contrato (com fallback a partir do valor cobrado). */
function resolvePlanPrice(
  contract: Pick<Contract, 'planId' | 'monthlyValue' | 'discountPercent'>,
  plans: Plan[],
) {
  const plan = plans.find((p) => p.id === contract.planId)
  if (plan) return plan.price
  const discount = contract.discountPercent
  if (discount > 0 && discount < 100) {
    return (
      Math.round((contract.monthlyValue / (1 - discount / 100)) * 100) / 100
    )
  }
  return contract.monthlyValue
}

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
  clauses: string[]
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
    clauses: [...contract.clauses],
  }
}

const statusOptions = (
  Object.entries(contractStatusLabel) as [ContractStatus, string][]
).map(([value, label]) => ({ value, label }))

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

type StudentContractsPanelProps = {
  student: Student
  onContractsChanged?: () => void
}

export function StudentContractsPanel({
  student,
  onContractsChanged,
}: StudentContractsPanelProps) {
  const [list, setList] = useState<Contract[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [studio, setStudio] = useState<StudioProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  async function loadContracts(notify = false) {
    const data = await fetchStudentContracts(student.id)
    setList(data)
    if (notify) onContractsChanged?.()
    return data
  }

  useEffect(() => {
    void fetchPlans()
      .then(setPlans)
      .catch(() => {
        toast.error('Não foi possível carregar os planos')
      })
    void fetchStudio()
      .then(setStudio)
      .catch(() => {
        /* contrato usa fallback se a API falhar */
      })
  }, [])

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

  const selected = useMemo(
    () => list.find((c) => c.id === selectedId) ?? null,
    [list, selectedId],
  )
  const activeContract = useMemo(
    () => list.find((c) => c.status === 'ativo') ?? null,
    [list],
  )

  useEffect(() => {
    if (!selected) {
      setEditing(false)
      setForm(null)
      return
    }
    if (!editing) setForm(toEditForm(selected))
  }, [selected, editing])

  function notify(title: string, description?: string) {
    toast.success(title, { description })
  }

  function updateForm<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updateClause(index: number, value: string) {
    setForm((prev) => {
      if (!prev) return prev
      const clauses = [...prev.clauses]
      clauses[index] = value
      return { ...prev, clauses }
    })
  }

  function addClause() {
    setForm((prev) =>
      prev ? { ...prev, clauses: [...prev.clauses, ''] } : prev,
    )
  }

  function removeClause(index: number) {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        clauses: prev.clauses.filter((_, i) => i !== index),
      }
    })
  }

  function handlePlanChange(planId: string) {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || !form) return
    setForm({
      ...form,
      planId,
      planLabel: `${planPeriodLabel[plan.period]} · ${plan.frequencyLabel}`,
      endDate: contractEndDateForPeriod(form.startDate, plan.period),
      monthlyValue:
        form.discountPercent > 0
          ? Math.round(plan.price * (1 - form.discountPercent / 100) * 100) /
            100
          : plan.price,
    })
  }

  function handleStartDateChange(startDate: string) {
    if (!form) return
    const plan = plans.find((p) => p.id === form.planId)
    setForm({
      ...form,
      startDate,
      endDate: plan
        ? contractEndDateForPeriod(startDate, plan.period)
        : form.endDate,
    })
  }

  async function handleSaveEdit() {
    if (!selected || !form) return
    try {
      const next = await updateContract(selected.id, {
        planId: form.planId,
        planLabel: form.planLabel,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        monthlyValue: Math.max(0, form.monthlyValue),
        discountPercent: Math.min(100, Math.max(0, form.discountPercent)),
        discountNote: form.discountNote.trim() || null,
        dueDay: Math.min(28, Math.max(1, form.dueDay)),
        paymentMethod: form.paymentMethod,
        financialResponsible: form.financialResponsible.trim(),
        lateFeePercent: Math.max(0, form.lateFeePercent),
        interestPercent: Math.max(0, form.interestPercent),
        clauses: form.clauses.map((c) => c.trim()).filter(Boolean),
        historyAction: 'Contrato e cláusulas editados',
      })
      setEditing(false)
      await loadContracts(true)
      notify('Contrato atualizado', next.number)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar o contrato',
      )
    }
  }

  async function handleDelete(contract: Contract) {
    const ok = window.confirm(
      `Apagar o contrato ${contract.number}? Esta ação não pode ser desfeita.`,
    )
    if (!ok) return
    try {
      await deleteContract(contract.id)
      setSelectedId(null)
      setEditing(false)
      await loadContracts(true)
      notify('Contrato apagado', contract.number)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível apagar o contrato',
      )
    }
  }

  async function handleSendSignature(contract: Contract) {
    setBusyAction('send')
    try {
      const next = (await contractAction(contract.id, 'send')) as Contract
      await loadContracts(true)
      notify(
        'Enviado para assinatura',
        `${next.number} · ${student.email || 'sem e-mail'}`,
      )
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar o contrato',
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleSign(contract: Contract) {
    const signatureName =
      window.prompt(
        'Nome do signatário',
        contract.financialResponsible || student.name,
      ) ?? ''
    if (!signatureName.trim()) return
    setBusyAction('sign')
    try {
      const next = (await contractAction(contract.id, 'sign', {
        signatureName: signatureName.trim(),
      })) as Contract
      await loadContracts(true)
      notify('Assinatura registrada', `${next.number} · contrato ativo`)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar a assinatura',
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleEmail(contract: Contract) {
    if (!student.email) {
      toast.error('Aluno sem e-mail cadastrado')
      return
    }
    setBusyAction('email')
    try {
      const result = (await contractAction(contract.id, 'email')) as {
        emailedTo: string
      }
      await loadContracts(true)
      notify(
        'Contrato enviado por e-mail',
        `${result.emailedTo} (em dev o conteúdo aparece no log do servidor)`,
      )
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar o e-mail',
      )
    } finally {
      setBusyAction(null)
    }
  }

  function buildContractHtml(contract: Contract) {
    const clauses = contract.clauses
      .map((c) => `<li>${escapeHtml(c)}</li>`)
      .join('')
    const plan = plans.find((p) => p.id === contract.planId)
    const planPrice = resolvePlanPrice(contract, plans)
    const totalClasses = plan
      ? contractTotalClasses({
          startDate: contract.startDate,
          endDate: contract.endDate,
          frequency: plan.frequency,
          schedule: student.schedule,
          planId: plan.id,
        })
      : 0
    const months = plan ? planPeriodMonths(plan.period) : null
    const vigenciaExtra = [
      months
        ? `${months} ${months === 1 ? 'mês' : 'meses'}`
        : null,
      totalClasses > 0 ? `${totalClasses} aulas` : null,
      plan?.frequencyLabel ?? null,
      `${formatShortDate(contract.startDate)} — ${formatShortDate(contract.endDate)}`,
    ]
      .filter(Boolean)
      .join(' · ')
    const discountLabel =
      contract.discountPercent > 0
        ? `${contract.discountPercent}%${
            contract.discountNote
              ? ` · ${escapeHtml(contract.discountNote)}`
              : ''
          }`
        : 'Sem desconto'
    const studioName = studio?.name ?? 'Estúdio'
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Contrato ${escapeHtml(contract.number)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 720px; margin: 32px auto; padding: 0 24px; line-height: 1.5; background: #fff; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; margin-top: 28px; }
    .meta { color: #555; font-size: 13px; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    dt { font-size: 11px; color: #666; } dd { margin: 0; font-size: 14px; }
    ol { padding-left: 20px; } li { margin-bottom: 8px; font-size: 13px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 12px; }
    .no-print { margin: 16px 0 24px; }
    .no-print button { font: inherit; padding: 8px 14px; cursor: pointer; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>
  <h1>Contrato ${escapeHtml(contract.number)}</h1>
  <p class="meta">${escapeHtml(studioName)} · Versão ${contract.version} · ${escapeHtml(contractStatusLabel[contract.status])}</p>
  <h2>Contratado (estúdio)</h2>
  <dl>
    <div><dt>Razão / nome</dt><dd>${escapeHtml(studioName)}</dd></div>
    <div><dt>Responsável</dt><dd>${escapeHtml(studio?.owner || '—')}</dd></div>
    <div><dt>CNPJ</dt><dd>${escapeHtml(studio?.cnpj || '—')}</dd></div>
    <div><dt>Telefone</dt><dd>${escapeHtml(studio?.phone || '—')}</dd></div>
    <div><dt>E-mail</dt><dd>${escapeHtml(studio?.email || '—')}</dd></div>
    <div><dt>Endereço</dt><dd>${escapeHtml(studio?.address || '—')}</dd></div>
  </dl>
  <h2>Contratante (aluno)</h2>
  <dl>
    <div><dt>Aluno</dt><dd>${escapeHtml(student.name)}</dd></div>
    <div><dt>CPF</dt><dd>${escapeHtml(student.cpf || '—')}</dd></div>
    <div><dt>E-mail</dt><dd>${escapeHtml(student.email || '—')}</dd></div>
    <div><dt>Telefone</dt><dd>${escapeHtml(student.phone || '—')}</dd></div>
    <div><dt>CEP</dt><dd>${escapeHtml(student.cep || '—')}</dd></div>
    <div><dt>Endereço</dt><dd>${escapeHtml(student.address || '—')}</dd></div>
    <div><dt>Responsável financeiro</dt><dd>${escapeHtml(contract.financialResponsible)}</dd></div>
  </dl>
  <h2>Condições</h2>
  <dl>
    <div><dt>Plano</dt><dd>${escapeHtml(contract.planLabel)}</dd></div>
    <div><dt>Aulas do contrato</dt><dd>${totalClasses > 0 ? `${totalClasses} aulas${plan?.frequencyLabel ? ` · ${escapeHtml(plan.frequencyLabel)}` : ''}` : '—'}</dd></div>
    <div><dt>Valor do plano</dt><dd>${escapeHtml(formatCurrency(planPrice))}</dd></div>
    <div><dt>Desconto</dt><dd>${discountLabel}</dd></div>
    <div><dt>Valor final</dt><dd>${escapeHtml(formatCurrency(contract.monthlyValue))}</dd></div>
    <div><dt>Vigência</dt><dd>${escapeHtml(formatShortDate(contract.startDate))} — ${escapeHtml(formatShortDate(contract.endDate))}${vigenciaExtra ? `<br/><span style="font-size:12px;color:#555">${escapeHtml(vigenciaExtra)}</span>` : ''}</dd></div>
    <div><dt>Vencimento</dt><dd>Dia ${contract.dueDay}</dd></div>
    <div><dt>Pagamento</dt><dd>${escapeHtml(contract.paymentMethod)}</dd></div>
    <div><dt>Multa / juros</dt><dd>${contract.lateFeePercent}% / ${contract.interestPercent}% a.m.</dd></div>
    <div><dt>Assinatura</dt><dd>${contract.signedAt ? `${escapeHtml(contract.signatureName ?? 'Assinado')} · ${escapeHtml(formatShortDate(contract.signedAt))}` : 'Pendente'}</dd></div>
  </dl>
  <h2>Cláusulas</h2>
  <ol>${clauses}</ol>
  <p class="footer">Documento gerado por ${escapeHtml(studioName)} via HealthCore em ${escapeHtml(formatShortDate(toIsoDate(new Date())))}.</p>
</body>
</html>`
  }

  function openPrintPreview(contract: Contract, autoPrint = false) {
    const html = buildContractHtml(contract)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) {
      URL.revokeObjectURL(url)
      toast.error('Permita pop-ups para visualizar/imprimir o contrato')
      return null
    }
    win.focus()
    // Revoga a URL depois que a janela carregar (ou após timeout)
    const cleanup = () => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }
    win.addEventListener('load', () => {
      if (autoPrint) {
        try {
          win.print()
        } catch {
          toast.message('Use Ctrl/Cmd+P na janela aberta para salvar em PDF')
        }
      }
      setTimeout(cleanup, 60_000)
    })
    // Fallback se o evento load não disparar em alguns browsers
    setTimeout(cleanup, 120_000)
    return win
  }

  function handlePreview(contract: Contract) {
    const win = openPrintPreview(contract, false)
    if (win) notify('Visualização aberta', contract.number)
  }

  function handlePrintPdf(contract: Contract) {
    const win = openPrintPreview(contract, true)
    if (win) {
      notify('PDF', 'Na janela aberta, use “Salvar como PDF” se o diálogo não abrir sozinho')
    }
  }

  async function handleRenew(contract: Contract) {
    setBusyAction('renew')
    try {
      const next = (await contractAction(contract.id, 'renew')) as Contract
      await loadContracts(true)
      setSelectedId(next.id)
      setEditing(false)
      notify('Contrato renovado', `Novo rascunho ${next.number}`)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível renovar o contrato',
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRescind(contract: Contract) {
    const ok = window.confirm(
      `Rescindir o contrato ${contract.number}? O status passará a cancelado.`,
    )
    if (!ok) return
    setBusyAction('rescind')
    try {
      const next = (await contractAction(contract.id, 'rescind')) as Contract
      await loadContracts(true)
      notify('Contrato rescindido', next.number)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível rescindir o contrato',
      )
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <>
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
              render={
                <Link href={`/alunos/${student.id}/contratos/novo`} />
              }
            >
              <Plus data-icon="inline-start" />
              Novo contrato
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeContract ? (
            <p className="mb-4 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Já existe um contrato ativo ({activeContract.number}). Para
              criar um novo, encerre ou rescinda o atual.
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
                <EmptyTitle className="text-center">
                  Nenhum contrato
                </EmptyTitle>
                <EmptyDescription className="whitespace-nowrap text-center">
                  Crie o primeiro contrato deste aluno para começar.
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
                        onClick={() => void handleDelete(selected)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Apagar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(selected)}
                      >
                        <Eye data-icon="inline-start" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintPdf(selected)}
                      >
                        <Printer data-icon="inline-start" />
                        Gerar PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          Boolean(busyAction) ||
                          selected.status === 'ativo' ||
                          selected.status === 'encerrado' ||
                          selected.status === 'cancelado'
                        }
                        onClick={() => void handleSendSignature(selected)}
                      >
                        <PenLine data-icon="inline-start" />
                        {busyAction === 'send'
                          ? 'Enviando…'
                          : 'Enviar assinatura'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          Boolean(busyAction) ||
                          selected.status === 'encerrado' ||
                          selected.status === 'cancelado' ||
                          Boolean(selected.signedAt)
                        }
                        onClick={() => void handleSign(selected)}
                      >
                        <CheckCircle2 data-icon="inline-start" />
                        {busyAction === 'sign'
                          ? 'Registrando…'
                          : 'Registrar assinatura'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busyAction) || !student.email}
                        onClick={() => void handleEmail(selected)}
                      >
                        <Mail data-icon="inline-start" />
                        {busyAction === 'email' ? 'Enviando…' : 'Enviar e-mail'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          Boolean(busyAction) ||
                          selected.status === 'cancelado' ||
                          selected.status === 'rascunho'
                        }
                        onClick={() => void handleRenew(selected)}
                      >
                        <RefreshCw data-icon="inline-start" />
                        {busyAction === 'renew' ? 'Renovando…' : 'Renovar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={
                          Boolean(busyAction) ||
                          selected.status === 'cancelado' ||
                          selected.status === 'encerrado'
                        }
                        onClick={() => void handleRescind(selected)}
                      >
                        <XCircle data-icon="inline-start" />
                        {busyAction === 'rescind'
                          ? 'Rescindindo…'
                          : 'Rescindir'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => void handleSaveEdit()}>
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
                              handleStartDateChange(e.target.value)
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-end">Término</FieldLabel>
                          <Input
                            id="c-end"
                            type="date"
                            value={form.endDate}
                            readOnly
                            className="bg-muted"
                          />
                        </Field>
                      </div>
                      {(() => {
                        const plan = plans.find((p) => p.id === form.planId)
                        if (!plan) return null
                        const total = contractTotalClasses({
                          startDate: form.startDate,
                          endDate: form.endDate,
                          frequency: plan.frequency,
                          schedule: student.schedule,
                          planId: plan.id,
                        })
                        const months = planPeriodMonths(plan.period)
                        return (
                          <p className="text-xs text-muted-foreground">
                            {formatShortDate(form.startDate)} —{' '}
                            {formatShortDate(form.endDate)} · {months}{' '}
                            {months === 1 ? 'mês' : 'meses'} · {total} aulas (
                            {plan.frequencyLabel})
                          </p>
                        )
                      })()}
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel>Valor do plano</FieldLabel>
                          <Input
                            value={formatCurrency(
                              plans.find((p) => p.id === form.planId)?.price ??
                                resolvePlanPrice(form, plans),
                            )}
                            readOnly
                            className="bg-muted"
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-value">Valor final</FieldLabel>
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
                      </div>
                      <div className="grid grid-cols-2 gap-3">
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
                            onChange={(e) => {
                              const discountPercent = Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0),
                              )
                              const plan = plans.find(
                                (p) => p.id === form.planId,
                              )
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      discountPercent,
                                      monthlyValue: plan
                                        ? studentChargedValue(
                                            plan,
                                            discountPercent,
                                          )
                                        : prev.monthlyValue,
                                    }
                                  : prev,
                              )
                            }}
                          />
                        </Field>
                      </div>
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
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <FieldLabel>Cláusulas do contrato</FieldLabel>
                            <p className="text-xs text-muted-foreground">
                              Texto padrão do estúdio. Edite só se precisar
                              adaptar este contrato.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateForm('clauses', [
                                  ...defaultContractClauses,
                                ])
                              }
                            >
                              Restaurar padrão
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={addClause}
                            >
                              <Plus data-icon="inline-start" />
                              Nova cláusula
                            </Button>
                          </div>
                        </div>
                        {form.clauses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma cláusula. Restaure o padrão ou adicione
                            uma.
                          </p>
                        ) : (
                          form.clauses.map((clause, index) => (
                            <div
                              key={`clause-${index}`}
                              className="flex flex-col gap-2 rounded-md border p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Cláusula {index + 1}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => removeClause(index)}
                                >
                                  <Trash2 data-icon="inline-start" />
                                  Remover
                                </Button>
                              </div>
                              <Textarea
                                value={clause}
                                rows={6}
                                placeholder="Texto da cláusula"
                                onChange={(e) =>
                                  updateClause(index, e.target.value)
                                }
                              />
                            </div>
                          ))
                        )}
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
                        label="Aulas do contrato"
                        value={(() => {
                          const plan = plans.find((p) => p.id === selected.planId)
                          if (!plan) return '—'
                          const total = contractTotalClasses({
                            startDate: selected.startDate,
                            endDate: selected.endDate,
                            frequency: plan.frequency,
                            schedule: student.schedule,
                            planId: plan.id,
                          })
                          return `${total} aulas · ${plan.frequencyLabel}`
                        })()}
                      />
                      <DetailItem
                        label="Valor do plano"
                        value={formatCurrency(
                          resolvePlanPrice(selected, plans),
                        )}
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
                        label="Valor final"
                        value={formatCurrency(selected.monthlyValue)}
                      />
                      <DetailItem
                        label="Dia de vencimento"
                        value={`Dia ${selected.dueDay}`}
                      />
                      <DetailItem
                        label="Vigência"
                        value={(() => {
                          const plan = plans.find((p) => p.id === selected.planId)
                          const range = `${formatShortDate(selected.startDate)} — ${formatShortDate(selected.endDate)}`
                          if (!plan) return range
                          const months = planPeriodMonths(plan.period)
                          const total = contractTotalClasses({
                            startDate: selected.startDate,
                            endDate: selected.endDate,
                            frequency: plan.frequency,
                            schedule: student.schedule,
                            planId: plan.id,
                          })
                          return (
                            <>
                              {range}
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {months} {months === 1 ? 'mês' : 'meses'} ·{' '}
                                {total} aulas · {plan.frequencyLabel}
                              </span>
                            </>
                          )
                        })()}
                      />
                      <DetailItem
                        label="Forma de pagamento"
                        value={selected.paymentMethod}
                      />
                      <DetailItem
                        label="Multa e juros"
                        value={`Multa ${selected.lateFeePercent}% · juros ${selected.interestPercent}% a.m.`}
                      />
                      {studio ? (
                        <>
                          <DetailItem label="Estúdio" value={studio.name} />
                          <DetailItem
                            label="CNPJ do estúdio"
                            value={studio.cnpj || '—'}
                          />
                          <DetailItem
                            label="Endereço do estúdio"
                            value={studio.address || '—'}
                          />
                        </>
                      ) : null}
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
