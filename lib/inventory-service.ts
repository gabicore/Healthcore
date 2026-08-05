import type { InventoryProduct } from '@/lib/clinic-types'
import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import { parseIsoDate, toIsoDateOnly } from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'
import type {
  CreateInventoryProductInput,
  UpdateInventoryProductInput,
} from '@/lib/validations/clinic'

function serializeProduct(row: {
  id: string
  name: string
  category: string
  lot: string
  expiresAt: Date | null
  quantity: number
  minQuantity: number
  supplier: string
}): InventoryProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lot: row.lot,
    expiresAt: row.expiresAt ? toIsoDateOnly(row.expiresAt) : null,
    quantity: row.quantity,
    minQuantity: row.minQuantity,
    supplier: row.supplier,
  }
}

export async function listInventoryProducts() {
  const rows = await prisma.inventoryProduct.findMany({
    where: { studioId: DEFAULT_STUDIO_ID },
    orderBy: { name: 'asc' },
  })
  return rows.map(serializeProduct)
}

export async function createInventoryProductRecord(
  input: CreateInventoryProductInput,
) {
  const created = await prisma.inventoryProduct.create({
    data: {
      studioId: DEFAULT_STUDIO_ID,
      name: input.name.trim(),
      category: input.category ?? '',
      lot: input.lot ?? '',
      expiresAt: input.expiresAt ? parseIsoDate(input.expiresAt) : null,
      quantity: input.quantity ?? 0,
      minQuantity: input.minQuantity ?? 0,
      supplier: input.supplier ?? '',
    },
  })
  return serializeProduct(created)
}

export async function updateInventoryProductRecord(
  id: string,
  input: UpdateInventoryProductInput,
) {
  const existing = await prisma.inventoryProduct.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
  })
  if (!existing) return null
  const updated = await prisma.inventoryProduct.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.lot !== undefined ? { lot: input.lot } : {}),
      ...(input.expiresAt !== undefined
        ? {
            expiresAt: input.expiresAt
              ? parseIsoDate(input.expiresAt)
              : null,
          }
        : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.minQuantity !== undefined
        ? { minQuantity: input.minQuantity }
        : {}),
      ...(input.supplier !== undefined ? { supplier: input.supplier } : {}),
    },
  })
  return serializeProduct(updated)
}

export async function deleteInventoryProductRecord(id: string) {
  const existing = await prisma.inventoryProduct.findFirst({
    where: { id, studioId: DEFAULT_STUDIO_ID },
    select: { id: true },
  })
  if (!existing) return null
  await prisma.inventoryProduct.delete({ where: { id } })
  return { id }
}
