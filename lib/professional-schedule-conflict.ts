import { DEFAULT_STUDIO_ID } from '@/lib/constants'
import { parseIsoDate } from '@/lib/db-mappers'
import { prisma } from '@/lib/prisma'

/**
 * Garante que a profissional não tenha Pilates nem atendimento clínico
 * no mesmo date+time (status ativo).
 */
export async function assertProfessionalSlotFree(input: {
  professionalId: string
  dateIso: string
  time: string
  ignoreClinicalAttendanceId?: string | null
  ignoreClassSessionId?: string | null
}) {
  const date = parseIsoDate(input.dateIso)

  const [clinicBusy, pilatesBusy] = await Promise.all([
    prisma.clinicalAttendance.findFirst({
      where: {
        studioId: DEFAULT_STUDIO_ID,
        professionalId: input.professionalId,
        date,
        time: input.time,
        status: { not: 'cancelada' },
        ...(input.ignoreClinicalAttendanceId
          ? { id: { not: input.ignoreClinicalAttendanceId } }
          : {}),
      },
      select: { id: true },
    }),
    prisma.classSession.findFirst({
      where: {
        studioId: DEFAULT_STUDIO_ID,
        professionalId: input.professionalId,
        date,
        time: input.time,
        status: { not: 'cancelada' },
        ...(input.ignoreClassSessionId
          ? { id: { not: input.ignoreClassSessionId } }
          : {}),
      },
      select: { id: true },
    }),
  ])

  if (clinicBusy) {
    throw new Error(
      'Profissional já tem atendimento clínico neste horário. Escolha outro horário.',
    )
  }
  if (pilatesBusy) {
    throw new Error(
      'Profissional já tem aula de Pilates neste horário. Escolha outro horário.',
    )
  }
}
