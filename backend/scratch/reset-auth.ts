
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'test@test.com';
  const password = 'password123';
  const name = 'Test User';

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('User already exists, updating password...');
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      });
      console.log('Password updated successfully');
    } else {
      console.log('Creating new test user...');
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          role: 'admin',
          plan: 'enterprise'
        }
      });
      console.log('Test user created successfully');
    }
    
    // Also update the demo user's password just in case
    const demoEmail = 'demo@aimarketing.com';
    const demoPassword = 'password123';
    const hashedDemoPassword = await bcrypt.hash(demoPassword, 12);
    await prisma.user.update({
      where: { email: demoEmail },
      data: { password: hashedDemoPassword }
    });
    console.log('Demo user password reset to password123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
