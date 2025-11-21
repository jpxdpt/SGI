import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup inicial se necessário
});

afterAll(async () => {
  await prisma.$disconnect();
});





