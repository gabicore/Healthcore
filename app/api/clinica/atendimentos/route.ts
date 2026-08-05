import { NextRequest } from 'next/server'

import { handleRouteError, jsonCreated, jsonError, jsonOk } from '@/lib/api'
import {
  createClinicalAttendanceRecord,
  listClinicalAttendances,
} from '@/lib/clinical-attendances-service'
import { createClinicalAttendanceSchema } from '@/lib/validations/clinic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const list = await listClinicalAttendances({
      fromDate: searchParams.get('from') ?? undefined,
      toDate: searchParams.get('to') ?? undefined,
      studentId: searchParams.get('studentId') ?? undefined,
      serviceId: searchParams.get('serviceId') ?? undefined,
    })
    return jsonOk(list)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createClinicalAttendanceSchema.parse(await request.json())
    try {
      return jsonCreated(await createClinicalAttendanceRecord(input))
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('não encontrad') ||
          error.message.includes('horário') ||
          error.message.includes('domingo'))
      ) {
        return jsonError(
          error.message,
          error.message.includes('não encontrad') ? 404 : 400,
        )
      }
      throw error
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
