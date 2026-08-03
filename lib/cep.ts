import { onlyDigits } from '@/lib/masks'

export type CepAddress = {
  street: string
  neighborhood: string
  city: string
  state: string
}

export type StructuredAddress = CepAddress & {
  addressNumber?: string
}

/** Monta o endereço único usado em contratos/impressões. */
export function composeAddress(parts: {
  street?: string
  addressNumber?: string
  neighborhood?: string
  city?: string
  state?: string
}) {
  const streetLine = [parts.street?.trim(), parts.addressNumber?.trim()]
    .filter(Boolean)
    .join(', ')
  const cityState = [parts.city?.trim(), parts.state?.trim()]
    .filter(Boolean)
    .join('/')
  const placeLine = [parts.neighborhood?.trim(), cityState]
    .filter(Boolean)
    .join(', ')

  if (streetLine && placeLine) return `${streetLine} — ${placeLine}`
  return streetLine || placeLine || ''
}

/**
 * Converte endereço legado ("Rua X, 10 — Bairro, Cidade/UF") nos campos
 * estruturados. Retorna null se o formato não for reconhecido.
 */
export function parseLegacyAddress(
  address: string,
): StructuredAddress | null {
  const raw = address.trim()
  if (!raw) return null

  const match = raw.match(
    /^(.+?),\s*(\d+\w*)\s*[—\-–]\s*(.+?),\s*(.+?)\/([A-Za-z]{2})$/u,
  )
  if (!match) return null

  return {
    street: match[1].trim(),
    addressNumber: match[2].trim(),
    neighborhood: match[3].trim(),
    city: match[4].trim(),
    state: match[5].trim().toUpperCase(),
  }
}

export function hasStructuredAddress(parts: {
  street?: string | null
  city?: string | null
}) {
  return Boolean(parts.street?.trim() || parts.city?.trim())
}

/**
 * Consulta CEP via API interna (proxy ViaCEP).
 * Retorna null se não localizar — campos seguem editáveis.
 */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return null

  try {
    const response = await fetch(`/api/cep/${digits}`, { cache: 'no-store' })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      success?: boolean
      data?: {
        found?: boolean
        street?: string
        neighborhood?: string
        city?: string
        state?: string
      }
      found?: boolean
      street?: string
      neighborhood?: string
      city?: string
      state?: string
      error?: string | { message?: string }
    }

    if (payload.success === false) return null
    if (typeof payload.error === 'string') return null
    if (payload.error && typeof payload.error === 'object') return null

    const data = payload.data ?? payload
    if (data.found === false) return null

    const street = data.street?.trim() ?? ''
    const neighborhood = data.neighborhood?.trim() ?? ''
    const city = data.city?.trim() ?? ''
    const state = data.state?.trim() ?? ''

    if (!street && !neighborhood && !city && !state) return null

    return { street, neighborhood, city, state }
  } catch {
    return null
  }
}

/** Consulta ViaCEP no servidor (sem depender da rota autenticada). */
export async function lookupCepServer(
  cep: string,
): Promise<CepAddress | null> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return null

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${digits}/json/`,
      {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
    )
    if (!response.ok) return null
    const data = (await response.json()) as {
      erro?: boolean | string
      logradouro?: string
      bairro?: string
      localidade?: string
      uf?: string
    }
    if (data.erro) return null

    const street = data.logradouro?.trim() ?? ''
    const neighborhood = data.bairro?.trim() ?? ''
    const city = data.localidade?.trim() ?? ''
    const state = data.uf?.trim() ?? ''
    if (!street && !neighborhood && !city && !state) return null
    return { street, neighborhood, city, state }
  } catch {
    return null
  }
}
