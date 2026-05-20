import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('Testing database connection...')
  console.log('DATABASE_URL:', process.env.DATABASE_URL)
  
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    const userCount = await prisma.user.count()
    console.log(`✅ Found ${userCount} users`)
    
  } catch (error) {
    console.error('❌ Database connection failed')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
