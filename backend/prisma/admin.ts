import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@mashimi.com';
  const password = 'AdminPassword2026!';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'admin',
        plan: 'enterprise',
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'admin',
        plan: 'enterprise',
        wallet: {
          create: {
            balance: 1000000,
            monthlyAllocation: 1000000,
            plan: 'enterprise',
          }
        }
      },
    });

    console.log('Admin user created/updated successfully:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
