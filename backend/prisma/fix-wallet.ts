import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fix() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@mashimi.com' }
  })
  
  if (!user) {
    console.log('User not found')
    return
  }

  await prisma.tokenWallet.upsert({
    where: { userId: user.id },
    update: { balance: 1000000, plan: 'enterprise', monthlyAllocation: 1000000 },
    create: {
      userId: user.id,
      balance: 1000000,
      monthlyAllocation: 1000000,
      plan: 'enterprise'
    }
  })
  console.log('✅ Admin Wallet fixed and populated with 1,000,000 tokens!')
}

fix().finally(() => prisma.$disconnect())
