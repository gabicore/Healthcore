import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'BAD_REQUEST',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiFailure = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/** Resposta envelopada (auth e novas rotas) */
export function apiOk<T>(data: T, init?: ResponseInit) {
  const body: ApiSuccess<T> = { success: true, data }
  return NextResponse.json(body, { status: 200, ...init })
}

export function apiCreated<T>(data: T) {
  const body: ApiSuccess<T> = { success: true, data }
  return NextResponse.json(body, { status: 201 })
}

export function apiFail(
  message: string,
  status = 400,
  code = 'BAD_REQUEST',
  details?: unknown,
) {
  const body: ApiFailure = {
    success: false,
    error: { code, message, details: details ?? null },
  }
  return NextResponse.json(body, { status })
}

/** Compatível com rotas legadas (corpo = data) */
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
  if (error instanceof AppError) {
    return apiFail(error.message, error.status, error.code, error.details)
  }
  if (error instanceof ZodError) {
    return apiFail('Dados inválidos', 400, 'VALIDATION_ERROR', error.flatten())
  }
  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    (error as { code?: string }).code === 'P2025'
  ) {
    return apiFail('Registro não encontrado', 404, 'NOT_FOUND')
  }
  return apiFail('Erro interno do servidor', 500, 'INTERNAL_ERROR')
}
