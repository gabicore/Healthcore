import type { PhysicalAssessment } from '@/lib/data'
import { AppError } from '@/lib/api'
import { findGoverningContract } from '@/lib/contracts-service'
import { prisma } from '@/lib/prisma'
import { parseIsoDate } from '@/lib/db-mappers'
import { serializeAssessments } from '@/lib/serializers/student'
import type {
  AssessmentType,
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

const UNIQUE_ASSESSMENT_TYPES = new Set(['Inicial', 'Alta'])

function serializeOne(row: DbAssessment): PhysicalAssessment {
  return serializeAssessments([row])[0]
}

async function assertUniqueAssessmentType(
  studentId: string,
  assessmentType: string,
  excludeId?: string,
) {
  if (!UNIQUE_ASSESSMENT_TYPES.has(assessmentType)) return

  const existing = await prisma.physicalAssessment.findFirst({
    where: {
      studentId,
      assessmentType,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (!existing) return

  throw new AppError(
    assessmentType === 'Inicial'
      ? 'Já existe uma avaliação inicial para esta pessoa'
      : 'Já existe uma avaliação de alta para esta pessoa',
  )
}

async function resolveCreateAssessmentType(
  studentId: string,
  requested?: AssessmentType,
): Promise<AssessmentType> {
  if (requested) return requested

  const hasInicial = await prisma.physicalAssessment.findFirst({
    where: { studentId, assessmentType: 'Inicial' },
    select: { id: true },
  })
  return hasInicial ? 'Reavaliação' : 'Inicial'
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
  if (!student) throw new Error('Pessoa não encontrada')

  const governing = await findGoverningContract(studentId)
  if (!governing) {
    throw new Error(
      'Assine um contrato ativo antes de registrar avaliações',
    )
  }

  const assessmentType = await resolveCreateAssessmentType(
    studentId,
    input.assessmentType,
  )
  await assertUniqueAssessmentType(studentId, assessmentType)

  const measures = input.measures ?? emptyMeasures

  const created = await prisma.physicalAssessment.create({
    data: {
      studentId,
      date: parseIsoDate(
        input.date ?? new Date().toISOString().slice(0, 10),
      ),
      assessmentType,
      professional: input.professional ?? '',
      specialty: input.specialty ?? '',
      service: input.service ?? '',
      chiefComplaint: input.chiefComplaint ?? '',
      painScale: input.painScale ?? null,
      affectedRegion: input.affectedRegion ?? '',
      functionalLimitations: input.functionalLimitations ?? '',
      clinicalFindings: input.clinicalFindings ?? '',
      testsPerformed: input.testsPerformed ?? '',
      testResults: input.testResults ?? '',
      treatmentObjectives: input.treatmentObjectives ?? '',
      weeklyFrequency: input.weeklyFrequency ?? '',
      estimatedSessions: input.estimatedSessions ?? '',
      plannedTechniques: input.plannedTechniques ?? '',
      guidelines: input.guidelines ?? '',
      referrals: input.referrals ?? '',
      weight: input.weight ?? 0,
      height: input.height ?? 0,
      bodyFat: input.bodyFat ?? null,
      muscleMass: input.muscleMass ?? null,
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

  if (input.assessmentType !== undefined) {
    await assertUniqueAssessmentType(
      existing.studentId,
      input.assessmentType,
      id,
    )
  }

  const updated = await prisma.physicalAssessment.update({
    where: { id },
    data: {
      ...(input.date !== undefined ? { date: parseIsoDate(input.date) } : {}),
      ...(input.assessmentType !== undefined
        ? { assessmentType: input.assessmentType }
        : {}),
      ...(input.professional !== undefined
        ? { professional: input.professional }
        : {}),
      ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
      ...(input.service !== undefined ? { service: input.service } : {}),
      ...(input.chiefComplaint !== undefined
        ? { chiefComplaint: input.chiefComplaint }
        : {}),
      ...(input.painScale !== undefined ? { painScale: input.painScale } : {}),
      ...(input.affectedRegion !== undefined
        ? { affectedRegion: input.affectedRegion }
        : {}),
      ...(input.functionalLimitations !== undefined
        ? { functionalLimitations: input.functionalLimitations }
        : {}),
      ...(input.clinicalFindings !== undefined
        ? { clinicalFindings: input.clinicalFindings }
        : {}),
      ...(input.testsPerformed !== undefined
        ? { testsPerformed: input.testsPerformed }
        : {}),
      ...(input.testResults !== undefined
        ? { testResults: input.testResults }
        : {}),
      ...(input.treatmentObjectives !== undefined
        ? { treatmentObjectives: input.treatmentObjectives }
        : {}),
      ...(input.weeklyFrequency !== undefined
        ? { weeklyFrequency: input.weeklyFrequency }
        : {}),
      ...(input.estimatedSessions !== undefined
        ? { estimatedSessions: input.estimatedSessions }
        : {}),
      ...(input.plannedTechniques !== undefined
        ? { plannedTechniques: input.plannedTechniques }
        : {}),
      ...(input.guidelines !== undefined ? { guidelines: input.guidelines } : {}),
      ...(input.referrals !== undefined ? { referrals: input.referrals } : {}),
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
