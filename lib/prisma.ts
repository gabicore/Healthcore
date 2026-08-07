import { config as loadEnv } from 'dotenv'
import { Prisma, PrismaClient } from '@prisma/client'

// Hostinger às vezes sobe variável só no painel; local usa .env.
// Arquivo "env" (sem ponto) não é padrão — só fallback se existir.
loadEnv({ path: '.env' })
loadEnv({ path: 'env' })

/** Incremente ao adicionar campos/models usados em runtime. */
const PRISMA_CLIENT_REVISION = 13

type PrismaWithRevision = PrismaClient & { __revision?: number }

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaWithRevision | undefined
}

function studentModelHasField(field: string) {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === 'Student')
  return Boolean(model?.fields.some((f) => f.name === field))
}

function assessmentScalarHasField(field: string) {
  // Usa o enum gerado — reflete o client carregado neste processo.
  const fields = Prisma.PhysicalAssessmentScalarFieldEnum as
    | Record<string, string>
    | undefined
  return Boolean(fields && field in fields)
}

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  }) as PrismaWithRevision
  client.__revision = PRISMA_CLIENT_REVISION
  return client
}

function isStaleClient(client: PrismaWithRevision) {
  // Após `prisma generate` + hot reload, o client em globalThis pode ficar
  // sem campos/models novos e quebrar em runtime (ex.: profession).
  if (client.__revision !== PRISMA_CLIENT_REVISION) return true
  if (typeof client.clinicalAttendance?.findFirst !== 'function') return true
  if (!studentModelHasField('allergies') || !studentModelHasField('clinicalAlerts')) {
    return true
  }
  if (!studentModelHasField('profession') || !studentModelHasField('treatmentResults')) {
    return true
  }
  if (
    !studentModelHasField('previousTreatmentFrequency') ||
    !studentModelHasField('dischargeReason')
  ) {
    return true
  }
  if (
    !assessmentScalarHasField('professional') ||
    !assessmentScalarHasField('specialty') ||
    !assessmentScalarHasField('assessmentType') ||
    !assessmentScalarHasField('treatmentObjectives')
  ) {
    return true
  }
  return false
}

function getPrismaClient() {
  const existing = globalForPrisma.prisma
  if (existing && !isStaleClient(existing)) return existing

  if (existing) {
    void existing.$disconnect().catch(() => undefined)
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrismaClient()
