import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonOk } from '@/lib/api'
import {
  createTimeSlotRecord,
  listTimeSlots,
} from '@/lib/settings-service'
import { createTimeSlotSchema } from '@/lib/validations/settings'

export async function GET() {
  try {
    return jsonOk(await listTimeSlots())
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = createTimeSlotSchema.parse(body)
    const created = await createTimeSlotRecord(input)
    return jsonCreated(created)
  } catch (error) {
    return handleRouteError(error)
  }
}
