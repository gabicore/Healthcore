import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { onlyDigits } from '@/lib/masks'

type RouteContext = {
  params: Promise<{ cep: string }>
}

type ViaCepResponse = {
  erro?: boolean | string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { cep } = await context.params
    const digits = onlyDigits(cep)
    if (digits.length !== 8) {
      return jsonError('CEP inválido', 400)
    }

    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return jsonError('Não foi possível consultar o CEP', 502)
    }

    const data = (await response.json()) as ViaCepResponse
    if (data.erro) {
      return jsonOk({
        found: false as const,
        street: '',
        neighborhood: '',
        city: '',
        state: '',
      })
    }

    return jsonOk({
      found: true as const,
      street: data.logradouro?.trim() ?? '',
      neighborhood: data.bairro?.trim() ?? '',
      city: data.localidade?.trim() ?? '',
      state: data.uf?.trim() ?? '',
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
