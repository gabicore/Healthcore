import type { InventoryProduct } from '@/lib/clinic-types'
import { parseJson } from '@/lib/api-client'
import type {
  CreateInventoryProductInput,
  UpdateInventoryProductInput,
} from '@/lib/validations/clinic'

export async function fetchInventoryProducts(): Promise<InventoryProduct[]> {
  const response = await fetch('/api/estoque', { cache: 'no-store' })
  return parseJson<InventoryProduct[]>(response)
}

export async function createInventoryProduct(
  input: CreateInventoryProductInput,
): Promise<InventoryProduct> {
  const response = await fetch('/api/estoque', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<InventoryProduct>(response)
}

export async function updateInventoryProduct(
  id: string,
  input: UpdateInventoryProductInput,
): Promise<InventoryProduct> {
  const response = await fetch(`/api/estoque/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<InventoryProduct>(response)
}

export async function deleteInventoryProduct(
  id: string,
): Promise<{ id: string }> {
  const response = await fetch(`/api/estoque/${id}`, { method: 'DELETE' })
  return parseJson<{ id: string }>(response)
}
