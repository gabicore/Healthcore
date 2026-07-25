import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { getStudio, updateStudioRecord } from '@/lib/settings-service'
import { updateStudioSchema } from '@/lib/validations/settings'

export async function GET() {
  try {
    const studio = await getStudio()
    if (!studio) return jsonError('Estúdio não encontrado', 404)
    return jsonOk(studio)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const input = updateStudioSchema.parse(body)
    const updated = await updateStudioRecord(input)
    if (!updated) return jsonError('Estúdio não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}
