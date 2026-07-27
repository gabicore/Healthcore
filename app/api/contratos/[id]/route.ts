import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deleteContractRecord,
  emailContractRecord,
  getContractById,
  renewContractRecord,
  rescindContractRecord,
  sendContractForSignatureRecord,
  signContractRecord,
  updateContractRecord,
} from '@/lib/contracts-service'
import { updateContractSchema } from '@/lib/validations/contract'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const row = await getContractById(id)
    if (!row) return jsonError('Contrato não encontrado', 404)
    return jsonOk(row)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const action =
      typeof body?.action === 'string' ? (body.action as string) : null

    if (action === 'send') {
      const updated = await sendContractForSignatureRecord(id)
      if (!updated) return jsonError('Contrato não encontrado', 404)
      return jsonOk(updated)
    }
    if (action === 'sign') {
      const updated = await signContractRecord(
        id,
        typeof body?.signatureName === 'string'
          ? body.signatureName
          : undefined,
      )
      if (!updated) return jsonError('Contrato não encontrado', 404)
      return jsonOk(updated)
    }
    if (action === 'email') {
      try {
        const result = await emailContractRecord(id)
        if (!result) return jsonError('Contrato não encontrado', 404)
        return jsonOk(result)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Aluno sem e-mail cadastrado'
        ) {
          return jsonError(error.message, 400)
        }
        throw error
      }
    }
    if (action === 'rescind') {
      const updated = await rescindContractRecord(id)
      if (!updated) return jsonError('Contrato não encontrado', 404)
      return jsonOk(updated)
    }
    if (action === 'renew') {
      const renewed = await renewContractRecord(id)
      if (!renewed) return jsonError('Contrato não encontrado', 404)
      return jsonOk(renewed)
    }

    const input = updateContractSchema.parse(body)
    try {
      const updated = await updateContractRecord(id, input)
      if (!updated) return jsonError('Contrato não encontrado', 404)
      return jsonOk(updated)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Plano não encontrado'
      ) {
        return jsonError(error.message, 404)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const ok = await deleteContractRecord(id)
    if (!ok) return jsonError('Contrato não encontrado', 404)
    return jsonOk({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
