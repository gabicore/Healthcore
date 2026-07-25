import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  listStudioHours,
  updateStudioHourRecord,
} from '@/lib/settings-service'
import { updateStudioHourSchema } from '@/lib/validations/settings'

export async function GET() {
  try {
    return jsonOk(await listStudioHours())
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const input = updateStudioHourSchema.parse(body)
    const updated = await updateStudioHourRecord(input)
    if (!updated) return jsonError('Horário não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}
