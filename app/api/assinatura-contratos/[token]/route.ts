import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  getContractBySigningToken,
  signContractByToken,
} from '@/lib/contracts-signing-service'

type RouteContext = {
  params: Promise<{ token: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const data = await getContractBySigningToken(decodeURIComponent(token))
    if (!data) return jsonError('Link de assinatura inválido ou expirado', 404)
    return jsonOk(data)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return jsonError('Dados inválidos', 400)
    }

    const signerName =
      typeof body.signerName === 'string' ? body.signerName : ''
    const signatureImage =
      typeof body.signatureImage === 'string' ? body.signatureImage : ''
    const accepted = body.accepted === true

    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress =
      forwarded?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      ''
    const userAgent = request.headers.get('user-agent') || ''

    try {
      const result = await signContractByToken({
        token: decodeURIComponent(token),
        signerName,
        signatureImage,
        accepted,
        ipAddress,
        userAgent,
      })
      return jsonOk({
        signedAt: result.signedAt,
        signerName: result.signerName,
        validationCode: result.validationCode,
        documentHash: result.documentHash,
        number: result.contract.number,
        version: result.contract.version,
      })
    } catch (error) {
      if (error instanceof Error) {
        return jsonError(error.message, 400)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
