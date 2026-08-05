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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InventoryProduct } from '@/lib/clinic-types'
import {
  createInventoryProduct,
  deleteInventoryProduct,
  fetchInventoryProducts,
  updateInventoryProduct,
} from '@/lib/inventory-api'

export function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryProduct | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [lot, setLot] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [minQuantity, setMinQuantity] = useState(0)
  const [supplier, setSupplier] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setProducts(await fetchInventoryProducts())
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o estoque',
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
    setCategory('')
    setLot('')
    setExpiresAt('')
    setQuantity(0)
    setMinQuantity(0)
    setSupplier('')
    setOpen(true)
  }

  function openEdit(product: InventoryProduct) {
    setEditing(product)
    setName(product.name)
    setCategory(product.category)
    setLot(product.lot)
    setExpiresAt(product.expiresAt ?? '')
    setQuantity(product.quantity)
    setMinQuantity(product.minQuantity)
    setSupplier(product.supplier)
    setOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do produto')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        category,
        lot,
        expiresAt: expiresAt || null,
        quantity,
        minQuantity,
        supplier,
      }
      if (editing) {
        await updateInventoryProduct(editing.id, payload)
        toast.success('Produto atualizado')
      } else {
        await createInventoryProduct(payload)
        toast.success('Produto cadastrado')
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

  async function handleDelete(product: InventoryProduct) {
    if (!window.confirm(`Excluir "${product.name}"?`)) return
    try {
      await deleteInventoryProduct(product.id)
      toast.success('Produto excluído')
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
        title="Estoque"
        description="Estrutura inicial — sem baixa automática"
      >
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Novo produto
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto cadastrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Mín.</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow
                      key={p.id}
                      className={
                        p.quantity <= p.minQuantity
                          ? 'bg-destructive/5'
                          : undefined
                      }
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.category || '—'}</TableCell>
                      <TableCell>{p.lot || '—'}</TableCell>
                      <TableCell>{p.expiresAt || '—'}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{p.minQuantity}</TableCell>
                      <TableCell>{p.supplier || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(p)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => void handleDelete(p)}
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
              {editing ? 'Editar produto' : 'Novo produto'}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Categoria</FieldLabel>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Lote</FieldLabel>
                <Input value={lot} onChange={(e) => setLot(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Validade</FieldLabel>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Quantidade</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                />
              </Field>
              <Field>
                <FieldLabel>Estoque mínimo</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Number(e.target.value) || 0)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Fornecedor</FieldLabel>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </Field>
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
