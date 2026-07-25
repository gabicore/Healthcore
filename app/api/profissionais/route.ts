import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonOk } from '@/lib/api'
import {
  createProfessionalRecord,
  listProfessionals,
} from '@/lib/settings-service'
import { createProfessionalSchema } from '@/lib/validations/settings'

export async function GET() {
  try {
    return jsonOk(await listProfessionals())
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = createProfessionalSchema.parse(body)
    const created = await createProfessionalRecord(input)
    return jsonCreated(created)
  } catch (error) {
    return handleRouteError(error)
  }
}
