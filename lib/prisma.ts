import { config as loadEnv } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Hostinger às vezes sobe variável só no painel; local usa .env.
// Arquivo "env" (sem ponto) não é padrão — só fallback se existir.
loadEnv({ path: '.env' })
loadEnv({ path: 'env' })

const dbUrl = process.env.DATABASE_URL || ''

console.log('DATABASE_URL set?', Boolean(dbUrl))
console.log('DATABASE host:', dbUrl.match(/@([^:/?]+)/)?.[1] ?? 'missing')
console.log('DATABASE user:', dbUrl.match(/:\/\/([^:]+):/)?.[1] ?? 'missing')
console.log(
  'DATABASE password:',
  dbUrl.match(/:\/\/[^:]+:([^@]+)@/)?.[1] ?? 'missing',
)
console.log('DATABASE name:', dbUrl.match(/\/([^/?]+)(\?|$)/)?.[1] ?? 'missing')
console.log('DATABASE_URL full:', dbUrl)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
