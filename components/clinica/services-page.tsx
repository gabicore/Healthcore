'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  serviceCategoryLabel,
  type ServiceCategory,
  type StudioService,
} from '@/lib/clinic-types'
import {
  createService,
  deleteService,
  fetchServices,
  updateService,
} from '@/lib/services-api'

const categories = Object.keys(serviceCategoryLabel) as ServiceCategory[]

export function ServicesPage() {
  const [services, setServices] = useState<StudioService[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StudioService | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ServiceCategory>('fisioterapia')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [price, setPrice] = useState(0)
  const [requiresAssessment, setRequiresAssessment] = useState(false)
  const [requiresEvolution, setRequiresEvolution] = useState(false)
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setServices(await fetchServices())
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar serviços',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function openCreate() {
    setEditing(null)
    setName('')
    setCategory('fisioterapia')
    setDurationMinutes(60)
    setPrice(0)
    setRequiresAssessment(false)
    setRequiresEvolution(false)
    setActive(true)
    setOpen(true)
  }

  function openEdit(service: StudioService) {
    setEditing(service)
    setName(service.name)
    setCategory(service.category)
    setDurationMinutes(service.durationMinutes)
    setPrice(service.price)
    setRequiresAssessment(service.requiresInitialAssessment)
    setRequiresEvolution(service.requiresEvolution)
    setActive(service.active)
    setOpen(true)
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      toast.error('Informe o nome do serviço')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        category,
        durationMinutes,
        price,
        requiresInitialAssessment: requiresAssessment,
        requiresEvolution,
        active,
      }
      if (editing) {
        await updateService(editing.id, payload)
        toast.success('Serviço atualizado')
      } else {
        await createService(payload)
        toast.success('Serviço criado')
      }
      setOpen(false)
      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível salvar',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(service: StudioService) {
    if (!window.confirm(`Excluir o serviço "${service.name}"?`)) return
    try {
      await deleteService(service.id)
      toast.success('Serviço excluído')
      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível excluir',
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Serviços"
        description="Catálogo clínico e estético (Pilates na grade permanece separado)"
      >
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Novo serviço
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Serviços cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : services.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        {serviceCategoryLabel[s.category]}
                      </TableCell>
                      <TableCell>{s.durationMinutes} min</TableCell>
                      <TableCell>
                        {s.price.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell>{s.active ? 'Ativo' : 'Inativo'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(s)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => void handleDelete(s)}
                          >
                            <Trash2 className="size-4" />
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
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar serviço' : 'Novo serviço'}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Categoria</FieldLabel>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory((v as ServiceCategory) ?? 'fisioterapia')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{serviceCategoryLabel[category]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {serviceCategoryLabel[c]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Duração (min)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Number(e.target.value) || 60)
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Valor</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresAssessment}
                onChange={(e) => setRequiresAssessment(e.target.checked)}
              />
              Necessita avaliação inicial
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresEvolution}
                onChange={(e) => setRequiresEvolution(e.target.checked)}
              />
              Necessita evolução
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Ativo
            </label>
          </FieldGroup>
          <DialogFooter showCloseButton={false}>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
