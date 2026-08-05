'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  CakeSlice,
  CalendarClock,
  Copy,
  Megaphone,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  type Campaign,
  type CampaignAudience,
  type CampaignAutomation,
  type CampaignChannel,
  type CampaignStatus,
  type CampaignType,
  campaignAudienceLabel,
  campaignAutomationLabel,
  campaignChannelLabel,
  campaignConversionRate,
  campaignMessageTemplates,
  campaignOpenRate,
  campaignStatusLabel,
  campaignTypeLabel,
  campaignVariableHints,
  daysUntilBirthday,
  formatShortDate,
  age,
  initials,
  removeCampaignTemplate,
  renameCampaignTemplate,
  students,
  toIsoDate,
} from '@/lib/data'
import {
  createCampaign,
  deleteCampaign,
  duplicateCampaign,
  fetchCampaigns,
  updateCampaign,
} from '@/lib/campaigns-api'
import { cn } from '@/lib/utils'

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function toDatetimeLocal(value?: string) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 16)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, string> = {
    rascunho: 'border-transparent bg-muted text-muted-foreground',
    agendada: 'border-transparent bg-chart-3/20 text-chart-3',
    em_andamento: 'border-transparent bg-primary/12 text-primary',
    pausada: 'border-transparent bg-chart-5/15 text-chart-5',
    finalizada: 'border-transparent bg-accent text-accent-foreground',
  }
  return (
    <Badge variant="outline" className={cn(styles[status])}>
      {campaignStatusLabel[status]}
    </Badge>
  )
}

type CampaignForm = {
  name: string
  type: CampaignType
  channel: CampaignChannel
  audience: CampaignAudience
  startDate: string
  scheduledAt: string
  status: CampaignStatus
  messageTemplate: string
  automation: CampaignAutomation | 'none'
  attachmentName: string
  attachmentKind: 'image' | 'pdf' | 'none'
}

function emptyForm(): CampaignForm {
  return {
    name: '',
    type: 'marketing',
    channel: 'whatsapp',
    audience: 'ativos',
    startDate: toIsoDate(new Date()),
    scheduledAt: '',
    status: 'rascunho',
    messageTemplate: campaignMessageTemplates[0].body,
    automation: 'none',
    attachmentName: '',
    attachmentKind: 'none',
  }
}

function formFromCampaign(c: Campaign): CampaignForm {
  const att = c.attachments[0]
  return {
    name: c.name,
    type: c.type,
    channel: c.channel,
    audience: c.audience,
    startDate: c.startDate,
    scheduledAt: toDatetimeLocal(c.scheduledAt),
    status: c.status,
    messageTemplate: c.messageTemplate,
    automation: c.automation ?? 'none',
    attachmentName: att?.name ?? '',
    attachmentKind: att?.kind ?? 'none',
  }
}

export function CampaignsPage() {
  const [tick, setTick] = useState(0)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CampaignForm>(emptyForm)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [renamingTemplateId, setRenamingTemplateId] = useState<string | null>(
    null,
  )
  const [templateNameDraft, setTemplateNameDraft] = useState('')

  const templates = useMemo(() => {
    void tick
    return [...campaignMessageTemplates]
  }, [tick])

  const selected = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId],
  )

  async function reloadCampaigns() {
    const data = await fetchCampaigns()
    setCampaigns(data)
  }

  useEffect(() => {
    let cancelled = false
    fetchCampaigns()
      .then((data) => {
        if (!cancelled) setCampaigns(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(errorMessage(err, 'Não foi possível carregar as campanhas'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    if (!campaigns.some((c) => c.id === selectedId)) setSelectedId(null)
  }, [campaigns, selectedId])

  function refreshTemplates() {
    setTick((n) => n + 1)
  }

  function notify(title: string, description?: string) {
    toast.success(title, { description })
  }

  function updateForm<K extends keyof CampaignForm>(
    key: K,
    value: CampaignForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(campaign: Campaign) {
    setEditingId(campaign.id)
    setForm(formFromCampaign(campaign))
    setDialogOpen(true)
  }

  function applyTemplate(templateId: string) {
    const tpl = campaignMessageTemplates.find((t) => t.id === templateId)
    if (!tpl) return
    updateForm('messageTemplate', tpl.body)
  }

  async function handleSaveCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Informe o nome da campanha')
      return
    }

    const attachments =
      form.attachmentKind !== 'none' && form.attachmentName.trim()
        ? [
            {
              id: `att-${Date.now()}`,
              name: form.attachmentName.trim(),
              kind: form.attachmentKind,
            },
          ]
        : []

    const payload = {
      name: form.name.trim(),
      type: form.type,
      channel: form.channel,
      audience: form.audience,
      audienceLabel: campaignAudienceLabel[form.audience],
      startDate: form.startDate,
      scheduledAt: form.scheduledAt || undefined,
      status: form.status,
      messageTemplate: form.messageTemplate,
      variables: campaignVariableHints.filter((v) =>
        form.messageTemplate.includes(v),
      ),
      attachments,
      automation: form.automation === 'none' ? null : form.automation,
    }

    try {
      if (editingId) {
        const next = await updateCampaign(editingId, payload)
        setDialogOpen(false)
        await reloadCampaigns()
        notify('Campanha atualizada', next.name)
        return
      }

      const created = await createCampaign(payload)
      setDialogOpen(false)
      setSelectedId(created.id)
      await reloadCampaigns()
      notify('Campanha criada', created.name)
    } catch (err) {
      toast.error(
        errorMessage(
          err,
          editingId
            ? 'Não foi possível atualizar a campanha'
            : 'Não foi possível criar a campanha',
        ),
      )
    }
  }

  async function handleDuplicate(campaign: Campaign) {
    try {
      const copy = await duplicateCampaign(campaign.id)
      setSelectedId(copy.id)
      await reloadCampaigns()
      notify('Campanha duplicada', copy.name)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível duplicar'))
    }
  }

  async function handlePauseToggle(campaign: Campaign) {
    try {
      if (campaign.status === 'pausada') {
        const next = await updateCampaign(campaign.id, {
          status: 'em_andamento',
        })
        await reloadCampaigns()
        notify('Campanha retomada', next.name)
        return
      }
      const next = await updateCampaign(campaign.id, { status: 'pausada' })
      await reloadCampaigns()
      notify('Campanha pausada', next.name)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível alterar o status'))
    }
  }

  async function handleDelete(campaign: Campaign) {
    const ok = window.confirm(`Excluir a campanha "${campaign.name}"?`)
    if (!ok) return
    try {
      await deleteCampaign(campaign.id)
      if (selectedId === campaign.id) setSelectedId(null)
      await reloadCampaigns()
      notify('Campanha excluída', campaign.name)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível excluir'))
    }
  }

  function startRename(campaign: Campaign) {
    setRenamingId(campaign.id)
    setRenameDraft(campaign.name)
  }

  async function commitRename(campaignId: string) {
    const trimmed = renameDraft.trim()
    if (!trimmed) {
      toast.error('Informe um nome válido')
      return
    }
    try {
      const next = await updateCampaign(campaignId, { name: trimmed })
      setRenamingId(null)
      await reloadCampaigns()
      notify('Nome atualizado', next.name)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível renomear'))
    }
  }

  function startRenameTemplate(id: string, name: string) {
    setRenamingTemplateId(id)
    setTemplateNameDraft(name)
  }

  function commitRenameTemplate(id: string) {
    const next = renameCampaignTemplate(id, templateNameDraft)
    if (!next) {
      toast.error('Informe um nome válido')
      return
    }
    setRenamingTemplateId(null)
    refreshTemplates()
    notify('Nome do modelo atualizado', next.name)
  }

  function handleDeleteTemplate(id: string, name: string) {
    const ok = window.confirm(`Excluir o modelo "${name}"?`)
    if (!ok) return
    if (!removeCampaignTemplate(id)) {
      toast.error('Mantenha ao menos um modelo')
      return
    }
    refreshTemplates()
    notify('Modelo excluído', name)
  }

  function openSchedule(campaign: Campaign) {
    setSelectedId(campaign.id)
    setScheduleAt(
      toDatetimeLocal(campaign.scheduledAt) ||
        `${toIsoDate(new Date())}T09:00`,
    )
    setScheduleOpen(true)
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !scheduleAt) {
      toast.error('Informe data e horário')
      return
    }
    try {
      const next = await updateCampaign(selectedId, {
        status: 'agendada',
        scheduledAt: scheduleAt,
        startDate: scheduleAt.slice(0, 10),
      })
      setScheduleOpen(false)
      await reloadCampaigns()
      notify(
        'Campanha agendada',
        `${next.name} · ${scheduleAt.replace('T', ' ')}`,
      )
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível agendar'))
    }
  }

  const birthdays = useMemo(
    () =>
      [...students]
        .filter((s) => s.active)
        .map((s) => ({ student: s, days: daysUntilBirthday(s.birthDate) }))
        .sort((a, b) => a.days - b.days)
        .slice(0, 3),
    [],
  )

  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Comunicação e marketing com pessoas e responsáveis"
      >
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Criar campanha
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>Próximos aniversários</CardTitle>
              <CardDescription>
                Base para campanhas de aniversário · até 3 próximos
              </CardDescription>
            </div>
            <CakeSlice className="size-5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {birthdays.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Nenhum aniversário próximo entre pessoas ativas.
              </p>
            ) : (
              birthdays.map(({ student, days }) => (
                <Link
                  key={student.id}
                  href={`/alunos/${student.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(student.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {student.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatShortDate(student.birthDate).slice(0, 5)} · fará{' '}
                      {age(student.birthDate) + (days === 0 ? 0 : 1)} anos
                    </span>
                  </div>
                  <Badge variant={days === 0 ? 'default' : 'secondary'}>
                    {days === 0 ? 'Hoje' : `${days}d`}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campanhas da instituição</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma campanha ainda. Crie a primeira para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Público-alvo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="min-w-[180px] font-medium">
                        {renamingId === campaign.id ? (
                          <Input
                            autoFocus
                            value={renameDraft}
                            className="h-8"
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => commitRename(campaign.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                commitRename(campaign.id)
                              }
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onClick={() => setSelectedId(campaign.id)}
                          >
                            {campaign.name}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaignTypeLabel[campaign.type]}
                      </TableCell>
                      <TableCell>
                        {campaignChannelLabel[campaign.channel]}
                      </TableCell>
                      <TableCell>{campaign.audienceLabel}</TableCell>
                      <TableCell className="tabular-nums">
                        {campaign.startDate.split('-').reverse().join('/')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startRename(campaign)}
                          >
                            Nome
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(campaign)}
                          >
                            <Pencil data-icon="inline-start" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(campaign)}
                          >
                            <Trash2 data-icon="inline-start" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modelos de mensagem</CardTitle>
              <CardDescription>
                Edite ou exclua os nomes dos modelos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex flex-col gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    {renamingTemplateId === tpl.id ? (
                      <Input
                        autoFocus
                        value={templateNameDraft}
                        className="h-8"
                        onChange={(e) => setTemplateNameDraft(e.target.value)}
                        onBlur={() => commitRenameTemplate(tpl.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitRenameTemplate(tpl.id)
                          }
                          if (e.key === 'Escape') {
                            setRenamingTemplateId(null)
                          }
                        }}
                      />
                    ) : (
                      <p className="text-sm font-medium">{tpl.name}</p>
                    )}
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Renomear ${tpl.name}`}
                        onClick={() => startRenameTemplate(tpl.id, tpl.name)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Excluir ${tpl.name}`}
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {tpl.body}
                  </p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Variáveis: {campaignVariableHints.join(' · ')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Automações</CardTitle>
              <CardDescription>
                Aniversários, lembretes, pós-venda e reativação
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(
                Object.entries(campaignAutomationLabel) as [
                  CampaignAutomation,
                  string,
                ][]
              ).map(([key, label]) => {
                const linked = campaigns.filter((c) => c.automation === key)
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm">{label}</span>
                    <Badge variant="secondary">
                      {linked.length} campanha(s)
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
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
                  <Megaphone className="size-4 text-muted-foreground" />
                  {selected.name}
                </SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  {campaignTypeLabel[selected.type]} ·{' '}
                  {campaignChannelLabel[selected.channel]}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 p-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(selected)}
                  >
                    <Pencil data-icon="inline-start" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(selected)}
                  >
                    <Copy data-icon="inline-start" />
                    Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSchedule(selected)}
                  >
                    <CalendarClock data-icon="inline-start" />
                    Agendar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      selected.status === 'finalizada' ||
                      selected.status === 'rascunho'
                    }
                    onClick={() => handlePauseToggle(selected)}
                  >
                    {selected.status === 'pausada' ? (
                      <>
                        <Play data-icon="inline-start" />
                        Retomar
                      </>
                    ) : (
                      <>
                        <Pause data-icon="inline-start" />
                        Pausar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(selected)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Excluir
                  </Button>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Público</dt>
                    <dd>{selected.audienceLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Início</dt>
                    <dd className="tabular-nums">
                      {selected.startDate.split('-').reverse().join('/')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Agendamento
                    </dt>
                    <dd className="tabular-nums">
                      {selected.scheduledAt
                        ? selected.scheduledAt.replace('T', ' ')
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Automação
                    </dt>
                    <dd>
                      {selected.automation
                        ? campaignAutomationLabel[selected.automation]
                        : 'Manual'}
                    </dd>
                  </div>
                </dl>

                <Separator />

                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">Mensagem</h3>
                  <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                    {selected.messageTemplate}
                  </p>
                  {selected.variables.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Variáveis: {selected.variables.join(' · ')}
                    </p>
                  ) : null}
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">Anexos</h3>
                  {selected.attachments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum anexo
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {selected.attachments.map((att) => (
                        <li
                          key={att.id}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          {att.name}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({att.kind === 'image' ? 'imagem' : 'PDF'})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <Separator />

                <section className="flex flex-col gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="size-4 text-muted-foreground" />
                    Resultados
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Enviados</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {selected.stats.sent}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Aberturas
                      </p>
                      <p className="text-lg font-semibold tabular-nums">
                        {selected.stats.opened}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({campaignOpenRate(selected.stats)}%)
                        </span>
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Cliques</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {selected.stats.clicked}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Conversões
                      </p>
                      <p className="text-lg font-semibold tabular-nums">
                        {selected.stats.converted}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({campaignConversionRate(selected.stats)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar campanha' : 'Criar campanha'}
            </DialogTitle>
            <DialogDescription>
              Defina tipo, canal, público, mensagem e anexos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCampaign}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="camp-name">Nome</FieldLabel>
                <Input
                  id="camp-name"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Ex.: Aniversariantes de agosto"
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Tipo</FieldLabel>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      updateForm('type', (v as CampaignType) ?? form.type)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(
                          Object.entries(campaignTypeLabel) as [
                            CampaignType,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Canal</FieldLabel>
                  <Select
                    value={form.channel}
                    onValueChange={(v) =>
                      updateForm(
                        'channel',
                        (v as CampaignChannel) ?? form.channel,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(
                          Object.entries(campaignChannelLabel) as [
                            CampaignChannel,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Público-alvo</FieldLabel>
                  <Select
                    value={form.audience}
                    onValueChange={(v) =>
                      updateForm(
                        'audience',
                        (v as CampaignAudience) ?? form.audience,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(
                          Object.entries(campaignAudienceLabel) as [
                            CampaignAudience,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      updateForm(
                        'status',
                        (v as CampaignStatus) ?? form.status,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(
                          Object.entries(campaignStatusLabel) as [
                            CampaignStatus,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="camp-start">Data de início</FieldLabel>
                  <Input
                    id="camp-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateForm('startDate', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Automação</FieldLabel>
                  <Select
                    value={form.automation}
                    onValueChange={(v) =>
                      updateForm(
                        'automation',
                        (v as CampaignForm['automation']) ?? 'none',
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Manual</SelectItem>
                        {(
                          Object.entries(campaignAutomationLabel) as [
                            CampaignAutomation,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Modelo de mensagem</FieldLabel>
                <Select
                  onValueChange={(v) => {
                    if (typeof v === 'string' && v) applyTemplate(v)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Aplicar um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {campaignMessageTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="camp-msg">Mensagem</FieldLabel>
                <Textarea
                  id="camp-msg"
                  rows={4}
                  value={form.messageTemplate}
                  onChange={(e) =>
                    updateForm('messageTemplate', e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis: {campaignVariableHints.join(' ')}
                </p>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Anexo</FieldLabel>
                  <Select
                    value={form.attachmentKind}
                    onValueChange={(v) =>
                      updateForm(
                        'attachmentKind',
                        (v as CampaignForm['attachmentKind']) ?? 'none',
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Sem anexo</SelectItem>
                        <SelectItem value="image">Imagem</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="camp-att">Nome do arquivo</FieldLabel>
                  <Input
                    id="camp-att"
                    value={form.attachmentName}
                    disabled={form.attachmentKind === 'none'}
                    onChange={(e) =>
                      updateForm('attachmentName', e.target.value)
                    }
                    placeholder="flyer.jpg"
                  />
                </Field>
              </div>
            </FieldGroup>

            <DialogFooter className="mt-6" showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? 'Salvar' : 'Criar campanha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Agendar envio</DialogTitle>
            <DialogDescription>
              Defina quando a campanha deve começar a enviar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSchedule}>
            <Field>
              <FieldLabel htmlFor="camp-schedule">Data e horário</FieldLabel>
              <Input
                id="camp-schedule"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                required
              />
            </Field>
            <DialogFooter className="mt-6" showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Agendar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
