import type { PhysicalAssessment } from '@/lib/data'
import { prisma } from '@/lib/prisma'
import { parseIsoDate } from '@/lib/db-mappers'
import { serializeAssessments } from '@/lib/serializers/student'
import type {
  CreateAssessmentInput,
  UpdateAssessmentInput,
} from '@/lib/validations/assessment'
import type { PhysicalAssessment as DbAssessment } from '@prisma/client'

const emptyMeasures = {
  armRight: 0,
  armLeft: 0,
  chest: 0,
  waist: 0,
  abdomen: 0,
  hip: 0,
  thighRight: 0,
  thighLeft: 0,
  calfRight: 0,
  calfLeft: 0,
}

function serializeOne(row: DbAssessment): PhysicalAssessment {
  return serializeAssessments([row])[0]
}

export async function listAssessments(studentId: string) {
  const rows = await prisma.physicalAssessment.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
  })
  return serializeAssessments(rows)
}

export async function getAssessmentById(id: string) {
  const row = await prisma.physicalAssessment.findUnique({ where: { id } })
  return row ? serializeOne(row) : null
}

export async function createAssessmentRecord(
  studentId: string,
  input: CreateAssessmentInput,
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) throw new Error('Aluno não encontrado')

  const latest = await prisma.physicalAssessment.findFirst({
    where: { studentId },
    orderBy: { date: 'desc' },
  })

  const measures = input.measures ??
    (latest
      ? {
          armRight: latest.armRight,
          armLeft: latest.armLeft,
          chest: latest.chest,
          waist: latest.waist,
          abdomen: latest.abdomen,
          hip: latest.hip,
          thighRight: latest.thighRight,
          thighLeft: latest.thighLeft,
          calfRight: latest.calfRight,
          calfLeft: latest.calfLeft,
        }
      : emptyMeasures)

  const created = await prisma.physicalAssessment.create({
    data: {
      studentId,
      date: parseIsoDate(
        input.date ?? new Date().toISOString().slice(0, 10),
      ),
      weight: input.weight ?? latest?.weight ?? 0,
      height: input.height ?? latest?.height ?? 1.65,
      bodyFat: input.bodyFat ?? latest?.bodyFat ?? null,
      muscleMass: input.muscleMass ?? latest?.muscleMass ?? null,
      ...measures,
    },
  })
  return serializeOne(created)
}

export async function updateAssessmentRecord(
  id: string,
  input: UpdateAssessmentInput,
) {
  const existing = await prisma.physicalAssessment.findUnique({
    where: { id },
  })
  if (!existing) return null

  const updated = await prisma.physicalAssessment.update({
    where: { id },
    data: {
      ...(input.date !== undefined ? { date: parseIsoDate(input.date) } : {}),
      ...(input.weight !== undefined ? { weight: input.weight } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.bodyFat !== undefined ? { bodyFat: input.bodyFat } : {}),
      ...(input.muscleMass !== undefined
        ? { muscleMass: input.muscleMass }
        : {}),
      ...(input.measures?.armRight !== undefined
        ? { armRight: input.measures.armRight }
        : {}),
      ...(input.measures?.armLeft !== undefined
        ? { armLeft: input.measures.armLeft }
        : {}),
      ...(input.measures?.chest !== undefined
        ? { chest: input.measures.chest }
        : {}),
      ...(input.measures?.waist !== undefined
        ? { waist: input.measures.waist }
        : {}),
      ...(input.measures?.abdomen !== undefined
        ? { abdomen: input.measures.abdomen }
        : {}),
      ...(input.measures?.hip !== undefined
        ? { hip: input.measures.hip }
        : {}),
      ...(input.measures?.thighRight !== undefined
        ? { thighRight: input.measures.thighRight }
        : {}),
      ...(input.measures?.thighLeft !== undefined
        ? { thighLeft: input.measures.thighLeft }
        : {}),
      ...(input.measures?.calfRight !== undefined
        ? { calfRight: input.measures.calfRight }
        : {}),
      ...(input.measures?.calfLeft !== undefined
        ? { calfLeft: input.measures.calfLeft }
        : {}),
    },
  })
  return serializeOne(updated)
}

export async function deleteAssessmentRecord(id: string) {
  const existing = await prisma.physicalAssessment.findUnique({
    where: { id },
  })
  if (!existing) return false
  await prisma.physicalAssessment.delete({ where: { id } })
  return true
}
