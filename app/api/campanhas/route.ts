import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonOk } from '@/lib/api'
import {
  createCampaignRecord,
  listCampaigns,
} from '@/lib/campaigns-service'
import { createCampaignSchema } from '@/lib/validations/campaign'

export async function GET() {
  try {
    return jsonOk(await listCampaigns())
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = createCampaignSchema.parse(body)
    const created = await createCampaignRecord(input)
    return jsonCreated(created)
  } catch (error) {
    return handleRouteError(error)
  }
}
