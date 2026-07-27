import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@healthcore.com'
  const passwordHash = await hashPassword('Admin@123')

  // Remove admin antigo com domínio anterior, se existir
  const legacy = await prisma.user.findUnique({
    where: { email: 'admin@studioflow.com' },
  })
  if (legacy) {
    await prisma.session.deleteMany({ where: { userId: legacy.id } })
    await prisma.account.deleteMany({ where: { userId: legacy.id } })
    await prisma.authAuditLog.deleteMany({ where: { userId: legacy.id } })
    await prisma.user.delete({ where: { id: legacy.id } })
    console.log('Admin legado admin@studioflow.com removido')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.account.deleteMany({
      where: { userId: existing.id, providerId: 'credential' },
    })
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: 'Administrador HealthCore',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    })
    await prisma.account.create({
      data: {
        userId: existing.id,
        accountId: existing.id,
        providerId: 'credential',
        password: passwordHash,
      },
    })
    console.log('Admin atualizado:', email)
  } else {
    const user = await prisma.user.create({
      data: {
        name: 'Administrador HealthCore',
        email,
        emailVerified: true,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    })
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: passwordHash,
      },
    })
    console.log('Admin criado:', email)
  }

  console.log('Users no banco:', await prisma.user.count())
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
