import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonError, jsonOk } from '@/lib/api'
import {
  createStudentRecord,
  listStudents,
} from '@/lib/students-service'
import { createStudentSchema } from '@/lib/validations/student'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim() || undefined
    const activeParam = searchParams.get('active')
    const active =
      activeParam === 'true'
        ? true
        : activeParam === 'false'
          ? false
          : undefined

    const students = await listStudents({ q, active })
    return jsonOk(students)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = createStudentSchema.parse(body)
    try {
      const created = await createStudentRecord(input)
      return jsonCreated(created)
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
