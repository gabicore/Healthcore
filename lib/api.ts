import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init })
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function jsonError(
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    { error: message, details: details ?? null },
    { status },
  )
}

export function handleRouteError(error: unknown) {
  console.error(error)
  if (error instanceof ZodError) {
    return jsonError('Dados inválidos', 400, error.flatten())
  }
  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    (error as { code?: string }).code === 'P2025'
  ) {
    return jsonError('Registro não encontrado', 404)
  }
  return jsonError('Erro interno do servidor', 500)
}
