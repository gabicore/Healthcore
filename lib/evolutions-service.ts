import type { Evolution } from '@/lib/data'
import { findGoverningContract } from '@/lib/contracts-service'
import { prisma } from '@/lib/prisma'
import { parseIsoDate } from '@/lib/db-mappers'
import { serializeEvolutions } from '@/lib/serializers/student'
import type {
  CreateEvolutionInput,
  UpdateEvolutionInput,
} from '@/lib/validations/evolution'
import type { Evolution as DbEvolution } from '@prisma/client'

function serializeOne(row: DbEvolution): Evolution {
  return serializeEvolutions([row])[0]
}

export async function listEvolutions(studentId: string) {
  const rows = await prisma.evolution.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
  })
  return serializeEvolutions(rows)
}

export async function getEvolutionById(id: string) {
  const row = await prisma.evolution.findUnique({ where: { id } })
  return row ? serializeOne(row) : null
}

export async function createEvolutionRecord(
  studentId: string,
  input: CreateEvolutionInput,
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) throw new Error('Aluno não encontrado')

  const governing = await findGoverningContract(studentId)
  if (!governing) {
    throw new Error(
      'Assine um contrato ativo antes de registrar evoluções',
    )
  }

  const studio = await prisma.studio.findUnique({
    where: { id: student.studioId },
  })

  const created = await prisma.evolution.create({
    data: {
      studentId,
      date: parseIsoDate(
        input.date ?? new Date().toISOString().slice(0, 10),
      ),
      professional: input.professional ?? studio?.owner ?? '',
      clinical: input.clinical ?? '',
      complaints: input.complaints ?? '',
      improvements: input.improvements ?? '',
      exercises: input.exercises ?? '',
      conduct: input.conduct ?? '',
    },
  })
  return serializeOne(created)
}

export async function updateEvolutionRecord(
  id: string,
  input: UpdateEvolutionInput,
) {
  const existing = await prisma.evolution.findUnique({ where: { id } })
  if (!existing) return null

  const updated = await prisma.evolution.update({
    where: { id },
    data: {
      ...(input.date !== undefined ? { date: parseIsoDate(input.date) } : {}),
      ...(input.professional !== undefined
        ? { professional: input.professional }
        : {}),
      ...(input.clinical !== undefined ? { clinical: input.clinical } : {}),
      ...(input.complaints !== undefined
        ? { complaints: input.complaints }
        : {}),
      ...(input.improvements !== undefined
        ? { improvements: input.improvements }
        : {}),
      ...(input.exercises !== undefined ? { exercises: input.exercises } : {}),
      ...(input.conduct !== undefined ? { conduct: input.conduct } : {}),
    },
  })
  return serializeOne(updated)
}

export async function deleteEvolutionRecord(id: string) {
  const existing = await prisma.evolution.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.evolution.delete({ where: { id } })
  return true
}
