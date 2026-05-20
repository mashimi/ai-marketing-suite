
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, name: true }
    });
    console.log('Total users:', users.length);
    console.log('User list:', users);
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
