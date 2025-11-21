"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
beforeAll(async () => {
    // Setup inicial se necessário
});
afterAll(async () => {
    await prisma.$disconnect();
});
