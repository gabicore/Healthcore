import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonOk } from '@/lib/api'
import {
  createInventoryProductRecord,
  listInventoryProducts,
} from '@/lib/inventory-service'
import { createInventoryProductSchema } from '@/lib/validations/clinic'

export async function GET() {
  try {
    return jsonOk(await listInventoryProducts())
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createInventoryProductSchema.parse(await request.json())
    return jsonCreated(await createInventoryProductRecord(input))
  } catch (error) {
    return handleRouteError(error)
  }
}
