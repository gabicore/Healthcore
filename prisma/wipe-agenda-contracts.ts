/**
 * Limpa dados transacionais para teste ponta a ponta:
 * aulas, contratos, agenda fixa e pagamentos.
 * Mantém alunos, planos, grade do estúdio e usuários.
 *
 * Uso: npx tsx prisma/wipe-agenda-contracts.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sessions = await prisma.classSession.deleteMany({})
  const payments = await prisma.payment.deleteMany({})
  const contracts = await prisma.contract.deleteMany({})
  const slots = await prisma.scheduleSlot.deleteMany({})

  console.log('Wipe concluído:')
  console.log(`  ClassSession: ${sessions.count}`)
  console.log(`  Payment: ${payments.count}`)
  console.log(`  Contract: ${contracts.count}`)
  console.log(`  ScheduleSlot: ${slots.count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
