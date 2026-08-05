import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonOk } from '@/lib/api'
import {
  createServiceRecord,
  listServices,
} from '@/lib/services-service'
import { createServiceSchema } from '@/lib/validations/clinic'

export async function GET(request: NextRequest) {
  try {
    const activeParam = request.nextUrl.searchParams.get('active')
    const active =
      activeParam === 'true'
        ? true
        : activeParam === 'false'
          ? false
          : undefined
    return jsonOk(await listServices({ active }))
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = createServiceSchema.parse(body)
    return jsonCreated(await createServiceRecord(input))
  } catch (error) {
    return handleRouteError(error)
  }
}
