import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkAdmin() {
  const email = 'admin@mashimi.com'
  const password = 'AdminPassword2026!'

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.log('❌ USER NOT FOUND in database')
    console.log('Running admin creation script...')
    const hashedPassword = await bcrypt.hash(password, 10)
    const created = await prisma.user.upsert({
      where: { email },
      update: { role: 'admin', plan: 'enterprise' },
      create: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'admin',
        plan: 'enterprise',
      },
    })
    console.log('✅ Admin user created:', created.email)
  } else {
    console.log('✅ Found user:', user.email, '| role:', user.role, '| plan:', user.plan)
    const isValid = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isValid ? '✅ YES' : '❌ NO')

    if (!isValid) {
      // Re-hash and update
      const hashedPassword = await bcrypt.hash(password, 10)
      await prisma.user.update({ where: { email }, data: { password: hashedPassword } })
      console.log('✅ Password has been reset to: AdminPassword2026!')
    }
  }

  await prisma.$disconnect()
}

checkAdmin().catch(console.error)
