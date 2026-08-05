'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Eye,
  History,
  Link2,
  RefreshCw,
  ScrollText,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { PlanFrequencyPeriodFields } from '@/components/students/plan-frequency-period-fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  contractAction,
  deleteContract,
  updateContract,
} from '@/lib/contracts-api'
import {
  type Contract,
  type ContractStatus,
  type PaymentMethod,
  type Plan,
  type Student,
  type StudioProfile,
  contractEndDateForPeriod,
  contractStatusLabel,
  contractTotalClasses,
  defaultContractClauses,
  formatCurrency,
  formatPlanModalityLabel,
  formatShortDate,
  isMinor,
  paymentMethods,
  planPeriodMonths,
  studentChargedValue,
  toIsoDate,
} from '@/lib/data'
import { fetchPlans, fetchStudio } from '@/lib/settings-api'
import { cn } from '@/lib/utils'

function signingLinkFor(token: string) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/assinar-contrato/${encodeURIComponent(token)}`
  }
  return `/assinar-contrato/${encodeURIComponent(token)}`
}

function formatDateTimeIso(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

type EditForm = {
  planId: string
  planLabel: string
  startDate: string
  endDate: string
  monthlyValue: number
  discountPercent: number
  dueDay: number
  paymentMethod: PaymentMethod
  financialResponsible: string
  lateFeePercent: number
  interestPercent: number
  clausesDocument: string
}

function clausesToDocument(clauses: string[]) {
  return clauses.join('\n\n').trim()
}

/** Preserva o texto do arquivo como um único bloco (sem fatiar em cláusulas). */
function documentToClauses(document: string) {
  const text = document.trim()
  return text ? [text] : []
}

function toEditForm(contract: Contract): EditForm {
  return {
    planId: contract.planId,
    planLabel: contract.planLabel,
    startDate: contract.startDate,
    endDate: contract.endDate,
    monthlyValue: contract.monthlyValue,
    discountPercent: contract.discountPercent,
    dueDay: contract.dueDay,
    paymentMethod: contract.paymentMethod,
    financialResponsible: contract.financialResponsible,
    lateFeePercent: contract.lateFeePercent,
    interestPercent: contract.interestPercent,
    clausesDocument: clausesToDocument(contract.clauses),
  }
}

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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

type ContractDetailViewProps = {
  student: Student
  initialContract: Contract
}

export function ContractDetailView({
  student,
  initialContract,
}: ContractDetailViewProps) {
  const router = useRouter()
  const backHref = `/alunos/${student.id}?tab=contratos`

  const [contract, setContract] = useState(initialContract)
  const [plans, setPlans] = useState<Plan[]>([])
  const [studio, setStudio] = useState<StudioProfile | null>(null)
  const [editing, setEditing] = useState(contract.status === 'rascunho')
  const [form, setForm] = useState<EditForm>(() => toEditForm(contract))
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  useEffect(() => {
    setContract(initialContract)
    setForm(toEditForm(initialContract))
    setEditing(initialContract.status === 'rascunho')
  }, [initialContract])

  useEffect(() => {
    void fetchPlans()
      .then(setPlans)
      .catch(() => toast.error('Não foi possível carregar os planos'))
    void fetchStudio()
      .then(setStudio)
      .catch(() => {
        /* preview usa fallback */
      })
  }, [])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.planId),
    [plans, form.planId],
  )
  const studentIsMinor = isMinor(student.birthDate)

  function goBack() {
    router.push(backHref)
    router.refresh()
  }

  function updateForm<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePlanChange(plan: Plan) {
    setForm((prev) => ({
      ...prev,
      planId: plan.id,
      planLabel: formatPlanModalityLabel(plan),
      endDate: contractEndDateForPeriod(prev.startDate, plan.period),
      monthlyValue:
        prev.discountPercent > 0
          ? Math.round(plan.price * (1 - prev.discountPercent / 100) * 100) /
            100
          : plan.price,
    }))
  }

  function handleStartDateChange(startDate: string) {
    const plan = plans.find((p) => p.id === form.planId)
    setForm((prev) => ({
      ...prev,
      startDate,
      endDate: plan
        ? contractEndDateForPeriod(startDate, plan.period)
        : prev.endDate,
    }))
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const next = await updateContract(contract.id, {
        planId: form.planId,
        planLabel: form.planLabel,
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyValue: Math.max(0, form.monthlyValue),
        discountPercent: Math.min(100, Math.max(0, form.discountPercent)),
        dueDay: Math.min(28, Math.max(1, form.dueDay)),
        paymentMethod: form.paymentMethod,
        financialResponsible: studentIsMinor
          ? form.financialResponsible.trim() || student.name
          : student.name,
        lateFeePercent: Math.max(0, form.lateFeePercent),
        interestPercent: Math.max(0, form.interestPercent),
        clauses: documentToClauses(form.clausesDocument),
        historyAction: 'Contrato e cláusulas editados',
      })
      setContract(next)
      setForm(toEditForm(next))
      setEditing(next.status === 'rascunho')
      toast.success('Contrato atualizado', { description: next.number })
      if (next.status !== 'rascunho') {
        setEditing(false)
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar o contrato',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `Apagar o contrato ${contract.number}? Esta ação não pode ser desfeita.`,
    )
    if (!ok) return
    try {
      await deleteContract(contract.id)
      toast.success('Contrato apagado', { description: contract.number })
      goBack()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível apagar o contrato',
      )
    }
  }

  function buildContractHtml(target: Contract, documentText?: string) {
    const arquivo = (documentText ?? clausesToDocument(target.clauses)).trim()
    const contractBody = arquivo
      ? `<div class="contract-body">${escapeHtml(arquivo).replaceAll('\n', '<br/>')}</div>`
      : '<p class="clause">Não há texto no arquivo do contrato.</p>'
    const plan = plans.find((p) => p.id === target.planId)
    const planPrice = resolvePlanPrice(target, plans)
    const months = plan ? planPeriodMonths(plan.period) : null
    const vigenciaLabel = [
      `${formatShortDate(target.startDate)} a ${formatShortDate(target.endDate)}`,
      months
        ? `${months} ${months === 1 ? 'mês' : 'meses'}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ')
    const discountLabel =
      target.discountPercent > 0
        ? `${target.discountPercent}%`
        : 'Não aplicável'
    const studioName = studio?.name ?? 'Estúdio'
    const generatedBy = studio?.owner?.trim() || '—'
    const studentIsMinor = isMinor(student.birthDate)
    const studentAddress =
      student.address?.trim() ||
      [
        [student.street, student.addressNumber].filter(Boolean).join(', '),
        student.neighborhood,
        [student.city, student.state].filter(Boolean).join('/'),
        student.cep,
      ]
        .filter(Boolean)
        .join(' — ') ||
      '—'
    const signatureLabel = studentIsMinor
      ? target.financialResponsible || student.name
      : student.name
    const signatureRole = studentIsMinor
      ? 'RESPONSÁVEL / CONTRATANTE'
      : 'CONTRATANTE'

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Contrato ${escapeHtml(target.number)}</title>
  <style>
    @page { size: A4; margin: 1.1cm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12pt;
      line-height: 1.28;
      color: #111;
      max-width: 210mm;
      margin: 0 auto;
      padding: 12px 16px 20px;
      background: #fff;
    }
    h1 {
      font-size: 12pt;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin: 0 0 10px;
    }
    h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      margin: 10px 0 4px;
      padding-bottom: 2px;
      border-bottom: 1px solid #222;
    }
    p { margin: 0 0 5px; text-align: justify; }
    .intro { margin-bottom: 8px; font-size: 11pt; }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 6px;
    }
    .party-title {
      font-size: 10pt;
      font-weight: 700;
      margin: 0 0 4px;
      text-transform: uppercase;
    }
    .field {
      font-size: 10pt;
      margin: 0 0 2px;
      line-height: 1.25;
      text-align: left;
    }
    .field strong { font-weight: 700; }
    .conditions {
      margin: 0 0 6px;
      font-size: 10pt;
    }
    .clause {
      margin: 0 0 5px;
      font-size: 10pt;
      line-height: 1.25;
      text-align: justify;
    }
    .contract-body {
      margin: 0 0 6px;
      font-size: 10pt;
      line-height: 1.35;
      text-align: justify;
    }
    .closing { margin-top: 8px; font-size: 10pt; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-top: 22px;
    }
    .signature { text-align: center; padding-top: 18px; }
    .signature .line {
      border-top: 1px solid #111;
      margin: 0 8px 4px;
    }
    .signature .name { font-size: 10pt; font-weight: 700; }
    .signature .role { font-size: 9pt; color: #333; }
    .footer {
      margin-top: 12px;
      padding-top: 4px;
      border-top: 1px solid #999;
      font-size: 8pt;
      color: #444;
      text-align: center;
    }
    .no-print { margin: 0 0 10px; text-align: right; }
    .no-print button {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      padding: 6px 12px;
      cursor: pointer;
    }
    @media print {
      body { margin: 0; padding: 0; max-width: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>

  <h1>Contrato de prestação de serviços</h1>

  <p class="intro">
    Pelo presente instrumento particular, as partes abaixo qualificadas celebram
    o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas
    e condições seguintes.
  </p>

  <h2>I — Qualificação das partes</h2>
  <div class="parties">
    <div>
      <p class="party-title">Contratado</p>
      <p class="field"><strong>Nome:</strong> ${escapeHtml(studioName)}</p>
      <p class="field"><strong>Responsável:</strong> ${escapeHtml(studio?.owner || '—')}</p>
      <p class="field"><strong>CNPJ:</strong> ${escapeHtml(studio?.cnpj || '—')}</p>
      <p class="field"><strong>Endereço:</strong> ${escapeHtml(studio?.address || '—')}</p>
      <p class="field"><strong>Telefone:</strong> ${escapeHtml(studio?.phone || '—')}</p>
      <p class="field"><strong>E-mail:</strong> ${escapeHtml(studio?.email || '—')}</p>
    </div>
    <div>
      <p class="party-title">Contratante</p>
      <p class="field"><strong>Aluno:</strong> ${escapeHtml(student.name)}</p>
      <p class="field"><strong>CPF:</strong> ${escapeHtml(student.cpf || '—')}</p>
      <p class="field"><strong>Nascimento:</strong> ${escapeHtml(formatShortDate(student.birthDate))}</p>
      <p class="field"><strong>Endereço:</strong> ${escapeHtml(studentAddress)}</p>
      <p class="field"><strong>Telefone:</strong> ${escapeHtml(student.phone || '—')}</p>
      <p class="field"><strong>E-mail:</strong> ${escapeHtml(student.email || '—')}</p>
      ${
        studentIsMinor
          ? `<p class="field"><strong>Responsável financeiro:</strong> ${escapeHtml(target.financialResponsible)}</p>`
          : ''
      }
    </div>
  </div>

  <h2>II — Condições comerciais</h2>
  <div class="conditions">
    <p class="field"><strong>Plano / modalidade:</strong> ${escapeHtml(target.planLabel)}</p>
    <p class="field"><strong>Vigência:</strong> ${escapeHtml(vigenciaLabel)}</p>
    <p class="field"><strong>Valor do plano:</strong> ${escapeHtml(formatCurrency(planPrice))}</p>
    <p class="field"><strong>Desconto:</strong> ${escapeHtml(discountLabel)}</p>
    <p class="field"><strong>Valor final mensal:</strong> ${escapeHtml(formatCurrency(target.monthlyValue))}</p>
    <p class="field"><strong>Dia de vencimento:</strong> Dia ${target.dueDay}</p>
    <p class="field"><strong>Forma de pagamento:</strong> ${escapeHtml(target.paymentMethod)}</p>
    <p class="field"><strong>Multa / juros:</strong> ${target.lateFeePercent}% / ${target.interestPercent}% a.m.</p>
  </div>

  <h2>III — Cláusulas contratuais</h2>
  ${contractBody}

  <p class="closing">
    E, por estarem justas e contratadas, as partes firmam o presente instrumento
    em duas vias de igual teor e forma, para um só efeito.
  </p>

  <div class="signatures">
    <div class="signature">
      <div class="line"></div>
      <div class="name">${escapeHtml(studioName)}</div>
      <div class="role">CONTRATADO</div>
    </div>
    <div class="signature">
      ${
        target.electronicSignature?.signatureImage
          ? `<img src="${target.electronicSignature.signatureImage}" alt="Assinatura" style="max-width:220px;height:auto;margin:0 auto 6px;display:block;" />`
          : '<div class="line"></div>'
      }
      <div class="name">${escapeHtml(target.electronicSignature?.signerName || signatureLabel)}</div>
      <div class="role">${signatureRole}</div>
    </div>
  </div>

  ${
    target.electronicSignature
      ? `<p class="footer">
    <strong>Documento assinado eletronicamente.</strong><br/>
    Assinante: ${escapeHtml(target.electronicSignature.signerName)} ·
    Data e hora: ${escapeHtml(formatDateTimeIso(target.electronicSignature.signedAt))} ·
    Contrato: ${escapeHtml(target.number)} ·
    Código de validação: ${escapeHtml(target.electronicSignature.validationCode)} ·
    Hash: ${escapeHtml(target.electronicSignature.documentHash)}
  </p>`
      : `<p class="footer">
    Documento gerado por ${escapeHtml(generatedBy)} em ${escapeHtml(formatShortDate(toIsoDate(new Date())))}.
  </p>`
  }
</body>
</html>`
  }

  function previewContract(): Contract {
    if (!editing) return contract
    return {
      ...contract,
      planId: form.planId,
      planLabel: form.planLabel,
      startDate: form.startDate,
      endDate: form.endDate,
      monthlyValue: Math.max(0, form.monthlyValue),
      discountPercent: Math.min(100, Math.max(0, form.discountPercent)),
      dueDay: Math.min(28, Math.max(1, form.dueDay)),
      paymentMethod: form.paymentMethod,
      financialResponsible: studentIsMinor
        ? form.financialResponsible.trim() || student.name
        : student.name,
      lateFeePercent: Math.max(0, form.lateFeePercent),
      interestPercent: Math.max(0, form.interestPercent),
      clauses: documentToClauses(form.clausesDocument),
    }
  }

  function openPrintPreview() {
    const target = previewContract()
    const html = buildContractHtml(target, clausesToDocument(target.clauses))
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) {
      URL.revokeObjectURL(url)
      toast.error('Permita pop-ups para visualizar/imprimir o contrato')
      return null
    }
    win.focus()
    const cleanup = () => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }
    win.addEventListener('load', () => {
      setTimeout(cleanup, 60_000)
    })
    setTimeout(cleanup, 120_000)
    return win
  }

  async function runAction(
    action: 'send' | 'sign' | 'renew' | 'rescind',
    key: string,
  ) {
    setBusyAction(key)
    try {
      if (action === 'sign') {
        const signatureName =
          window.prompt(
            'Nome do signatário',
            contract.financialResponsible || student.name,
          ) ?? ''
        if (!signatureName.trim()) return
        const next = (await contractAction(contract.id, 'sign', {
          signatureName: signatureName.trim(),
        })) as Contract
        setContract(next)
        setForm(toEditForm(next))
        setEditing(false)
        toast.success('Assinatura registrada', {
          description: `${next.number} · contrato ativo`,
        })
        goBack()
        return
      }
      if (action === 'renew') {
        const next = (await contractAction(contract.id, 'renew')) as Contract
        toast.success('Contrato renovado', {
          description: `Novo rascunho ${next.number}`,
        })
        router.push(`/alunos/${student.id}/contratos/${next.id}`)
        router.refresh()
        return
      }
      if (action === 'rescind') {
        const ok = window.confirm(
          `Rescindir o contrato ${contract.number}? O status passará a cancelado.`,
        )
        if (!ok) return
        const next = (await contractAction(contract.id, 'rescind')) as Contract
        setContract(next)
        setForm(toEditForm(next))
        setEditing(false)
        toast.success('Contrato rescindido', { description: next.number })
        return
      }
      const next = (await contractAction(contract.id, 'send')) as Contract
      setContract(next)
      setForm(toEditForm(next))
      setEditing(next.status === 'rascunho')
      const link = next.signingToken
        ? signingLinkFor(next.signingToken)
        : null
      toast.success('Link de assinatura pronto', {
        description: link ?? next.number,
      })
      if (link) {
        try {
          await navigator.clipboard.writeText(link)
          toast.message('Link copiado para a área de transferência')
        } catch {
          toast.message('Copie o link manualmente', { description: link })
        }
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Não foi possível concluir a ação',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const contentLocked =
    contract.status === 'ativo' ||
    contract.status === 'encerrado' ||
    contract.status === 'cancelado' ||
    Boolean(contract.electronicSignature)

  return (
    <>
      <PageHeader
        title={`Contrato ${contract.number}`}
        description={`Versão ${contract.version} · atualizado em ${formatShortDate(contract.updatedAt)} · ${student.name}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ContractStatusBadge status={contract.status} />
          {contract.electronicSignature ? (
            <Badge variant="secondary">Assinado eletronicamente</Badge>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={backHref} />}
          >
            Voltar
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-end gap-2 space-y-0">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (contract.status === 'rascunho') {
                      goBack()
                      return
                    }
                    setForm(toEditForm(contract))
                    setEditing(false)
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={contentLocked}
                  onClick={() => {
                    if (contentLocked) {
                      toast.message('Contrato assinado não pode ser editado', {
                        description: 'Use Renovar para criar uma nova versão.',
                      })
                      return
                    }
                    setForm(toEditForm(contract))
                    setEditing(true)
                  }}
                >
                  Editar
                </Button>
              </>
            )}
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleDelete()}
              >
                <Trash2 data-icon="inline-start" />
                Apagar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const win = openPrintPreview()
                  if (win) {
                    toast.success('Visualização aberta', {
                      description: contract.number,
                    })
                  }
                }}
              >
                <Eye data-icon="inline-start" />
                Visualizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  Boolean(busyAction) ||
                  contract.status === 'ativo' ||
                  contract.status === 'encerrado' ||
                  contract.status === 'cancelado'
                }
                onClick={() => void runAction('send', 'send')}
              >
                <Link2 data-icon="inline-start" />
                {busyAction === 'send'
                  ? 'Gerando link…'
                  : 'Enviar assinatura'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  Boolean(busyAction) ||
                  contract.status === 'encerrado' ||
                  contract.status === 'cancelado' ||
                  Boolean(contract.signedAt)
                }
                onClick={() => void runAction('sign', 'sign')}
              >
                <CheckCircle2 data-icon="inline-start" />
                {busyAction === 'sign'
                  ? 'Registrando…'
                  : 'Registrar assinatura'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  Boolean(busyAction) ||
                  contract.status === 'cancelado' ||
                  contract.status === 'rascunho'
                }
                onClick={() => void runAction('renew', 'renew')}
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
                  contract.status === 'cancelado' ||
                  contract.status === 'encerrado'
                }
                onClick={() => void runAction('rescind', 'rescind')}
              >
                <XCircle data-icon="inline-start" />
                {busyAction === 'rescind' ? 'Rescindindo…' : 'Rescindir'}
              </Button>
            </div>

            {editing ? (
              <FieldGroup className="gap-6">
                <div>
                  <h3 className="mb-3 text-sm font-medium">Dados do aluno</h3>
                  <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Nome" value={student.name} />
                    <DetailItem label="CPF" value={student.cpf} />
                    <DetailItem label="E-mail" value={student.email} />
                    <DetailItem label="Telefone" value={student.phone} />
                  </dl>
                </div>

                <Separator />

                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium">Condições do plano</h3>
                  <PlanFrequencyPeriodFields
                    plans={plans}
                    planId={form.planId}
                    onChange={handlePlanChange}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field>
                      <FieldLabel>Situação</FieldLabel>
                      <div className="flex h-8 items-center">
                        <ContractStatusBadge status={contract.status} />
                      </div>
                    </Field>
                    {studentIsMinor ? (
                      <Field className="sm:col-span-2">
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
                          placeholder="Nome do responsável"
                        />
                      </Field>
                    ) : null}
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
                    <Field>
                      <FieldLabel>Valor do plano</FieldLabel>
                      <Input
                        value={formatCurrency(
                          selectedPlan?.price ??
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
                    <Field>
                      <FieldLabel htmlFor="c-due">Dia vencimento</FieldLabel>
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
                      <FieldLabel htmlFor="c-discount">Desconto (%)</FieldLabel>
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
                          setForm((prev) => ({
                            ...prev,
                            discountPercent,
                            monthlyValue: selectedPlan
                              ? studentChargedValue(
                                  selectedPlan,
                                  discountPercent,
                                )
                              : prev.monthlyValue,
                          }))
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Forma de pagamento</FieldLabel>
                      <Select
                        value={form.paymentMethod}
                        onValueChange={(v) => {
                          if (v)
                            updateForm('paymentMethod', v as PaymentMethod)
                        }}
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

                  {selectedPlan ? (
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(form.startDate)} —{' '}
                      {formatShortDate(form.endDate)} ·{' '}
                      {planPeriodMonths(selectedPlan.period)}{' '}
                      {planPeriodMonths(selectedPlan.period) === 1
                        ? 'mês'
                        : 'meses'}{' '}
                      ·{' '}
                      {contractTotalClasses({
                        startDate: form.startDate,
                        endDate: form.endDate,
                        frequency: selectedPlan.frequency,
                      })}{' '}
                      aulas ({selectedPlan.frequencyLabel})
                    </p>
                  ) : null}
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">Arquivo do contrato</h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateForm(
                          'clausesDocument',
                          clausesToDocument(defaultContractClauses),
                        )
                      }
                    >
                      Restaurar padrão
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este texto é usado na geração do contrato (visualizar / PDF).
                    Edite livremente; a formatação e as quebras de linha são
                    preservadas.
                  </p>
                  <Textarea
                    value={form.clausesDocument}
                    onChange={(e) =>
                      updateForm('clausesDocument', e.target.value)
                    }
                    rows={18}
                    className="min-h-72 text-sm leading-relaxed"
                    placeholder="Texto das cláusulas do contrato"
                  />
                </div>
              </FieldGroup>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="mb-1 text-sm font-medium">Dados do aluno</h3>
                  <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Nome" value={student.name} />
                    <DetailItem label="CPF" value={student.cpf} />
                    <DetailItem label="E-mail" value={student.email} />
                    <DetailItem label="Telefone" value={student.phone} />
                  </dl>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-1 text-sm font-medium">
                    Condições do plano
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                    {studentIsMinor ? (
                      <DetailItem
                        label="Responsável financeiro"
                        value={contract.financialResponsible}
                      />
                    ) : null}
                    <DetailItem
                      label="Plano / modalidade"
                      value={contract.planLabel}
                    />
                    <DetailItem
                      label="Valor final"
                      value={formatCurrency(contract.monthlyValue)}
                    />
                    <DetailItem
                      label="Dia de vencimento"
                      value={`Dia ${contract.dueDay}`}
                    />
                    <DetailItem
                      label="Forma de pagamento"
                      value={contract.paymentMethod}
                    />
                    <DetailItem
                      label="Situação"
                      value={<ContractStatusBadge status={contract.status} />}
                    />
                  </dl>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <ScrollText className="size-4 text-muted-foreground" />
                    Arquivo do contrato
                  </h3>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {clausesToDocument(contract.clauses) || '—'}
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <History className="size-4 text-muted-foreground" />
                    Histórico de alterações
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {contract.history.map((entry, i) => (
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
