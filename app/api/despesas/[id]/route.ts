import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteExpenseRecord,
  getExpenseById,
  updateExpenseRecord,
} from '@/lib/expenses-service'
import { updateExpenseSchema } from '@/lib/validations/expense'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const expense = await getExpenseById(id)
    if (!expense) return jsonError('Despesa não encontrada', 404)
    return jsonOk(expense)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = updateExpenseSchema.parse(body)
    const updated = await updateExpenseRecord(id, input)
    if (!updated) return jsonError('Despesa não encontrada', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const ok = await deleteExpenseRecord(id)
    if (!ok) return jsonError('Despesa não encontrada', 404)
    return jsonOk({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
