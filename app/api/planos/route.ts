import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonOk } from '@/lib/api'
import { createPlanRecord, listPlans } from '@/lib/settings-service'
import { createPlanSchema } from '@/lib/validations/settings'

export async function GET() {
  try {
    return jsonOk(await listPlans())
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = createPlanSchema.parse(body)
    const created = await createPlanRecord(input)
    return jsonCreated(created)
  } catch (error) {
    return handleRouteError(error)
  }
}
