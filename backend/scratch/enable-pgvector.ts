import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Extension pgvector enabled successfully');
  } catch (error) {
    console.error('Failed to enable pgvector extension:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
