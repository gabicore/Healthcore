import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonOk } from '@/lib/api'
import {
  createExpenseRecord,
  listExpenses,
} from '@/lib/expenses-service'
import { createExpenseSchema } from '@/lib/validations/expense'

export async function GET() {
  try {
    return jsonOk(await listExpenses())
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = createExpenseSchema.parse(body)
    const created = await createExpenseRecord(input)
    return jsonCreated(created)
  } catch (error) {
    return handleRouteError(error)
  }
}
