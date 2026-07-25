import { NextRequest } from 'next/server'

import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  deactivateStudentRecord,
  getStudentById,
  updateStudentRecord,
} from '@/lib/students-service'
import { updateStudentSchema } from '@/lib/validations/student'

type RouteContext = {
  params: Promise<{ id: string }>
}

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
    const updated = await deactivateStudentRecord(id)
    if (!updated) return jsonError('Aluno não encontrado', 404)
    return jsonOk(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}
