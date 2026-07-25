import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deletePaymentRecord,
  getPaymentById,
  updatePaymentRecord,
} from '@/lib/payments-service'
import { updatePaymentSchema } from '@/lib/validations/payment'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const payment = await getPaymentById(id)
    if (!payment) return jsonError('Pagamento não encontrado', 404)
    return jsonOk(payment)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = updatePaymentSchema.parse(body)
    const updated = await updatePaymentRecord(id, input)
    if (!updated) return jsonError('Pagamento não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const ok = await deletePaymentRecord(id)
    if (!ok) return jsonError('Pagamento não encontrado', 404)
    return jsonOk({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
