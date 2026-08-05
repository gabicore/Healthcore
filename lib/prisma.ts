import { config as loadEnv } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Hostinger às vezes sobe variável só no painel; local usa .env.
// Arquivo "env" (sem ponto) não é padrão — só fallback se existir.
loadEnv({ path: '.env' })
loadEnv({ path: 'env' })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  })
}

function isStaleClient(client: PrismaClient) {
  // Após `prisma generate` + hot reload, o client em globalThis pode ficar
  // sem models novos (ex.: clinicalAttendance) e quebrar em runtime.
  return typeof client.clinicalAttendance?.findFirst !== 'function'
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
