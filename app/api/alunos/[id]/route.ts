import { NextRequest } from 'next/server'
import { z } from 'zod'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { requireSession } from '@/lib/auth/session'
import { assertAdminPassword } from '@/lib/auth/services/user-service'
import {
  deleteStudentRecord,
  getStudentById,
  updateStudentRecord,
} from '@/lib/students-service'
import { updateStudentSchema } from '@/lib/validations/student'

type RouteContext = {
  params: Promise<{ id: string }>
}

const deleteStudentSchema = z.object({
  adminPassword: z.string().min(1, 'Informe a senha do administrador'),
})

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const student = await getStudentById(id)
    if (!student) return jsonError('Aluno não encontrado', 404)
    return jsonOk(student)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const input = updateStudentSchema.parse(body)
    try {
      const updated = await updateStudentRecord(id, input)
      if (!updated) return jsonError('Aluno não encontrado', 404)
      return jsonOk(updated)
    } catch (error) {
      if (error instanceof Error && error.message === 'Plano não encontrado') {
        return jsonError(error.message, 404)
      }
      if (
        error instanceof Error &&
        error.message.includes('contrato ativo')
      ) {
        return jsonError(error.message, 400)
      }
      if (
        error instanceof Error &&
        error.message.includes('Período de agenda')
      ) {
        return jsonError(error.message, 404)
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireSession()
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const { adminPassword } = deleteStudentSchema.parse(body)
    await assertAdminPassword(adminPassword)

    const deleted = await deleteStudentRecord(id)
    if (!deleted) return jsonError('Aluno não encontrado', 404)
    return jsonOk(deleted)
  } catch (error) {
    return handleRouteError(error)
  }
}
