"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../routes/auth"));
const prisma_1 = require("../prisma");
const password_1 = require("../utils/password");
const client_1 = require("@prisma/client");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'tenant-default';
describe('Autenticação API', () => {
    let testUser;
    beforeAll(async () => {
        // Criar utilizador de teste
        const password = 'test123';
        const passwordHash = await (0, password_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({
            data: {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Test User',
                email: 'test@test.local',
                passwordHash,
                role: client_1.Role.ADMIN,
            },
        });
        testUser = { id: user.id, email: user.email, password };
    });
    afterAll(async () => {
        // Limpar utilizador de teste
        await prisma_1.prisma.user.deleteMany({
            where: { email: testUser.email },
        });
    });
    describe('POST /api/auth/login', () => {
        it('deve fazer login com credenciais válidas', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: testUser.password,
            });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.headers['set-cookie']).toBeDefined();
        });
        it('deve retornar erro com credenciais inválidas', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: 'wrongpassword',
            });
            expect(res.status).toBe(401);
            expect(res.body.message).toContain('Credenciais inválidas');
        });
        it('deve retornar erro com email inexistente', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@test.local',
                password: 'anypassword',
            });
            expect(res.status).toBe(401);
            expect(res.body.message).toContain('Credenciais inválidas');
        });
    });
    describe('POST /api/auth/refresh', () => {
        it('deve renovar o access token com refresh token válido', async () => {
            // Primeiro fazer login
            const loginRes = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: testUser.password,
            });
            const cookies = loginRes.headers['set-cookie'];
            // Usar o refresh token para obter novo access token
            const refreshRes = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .set('Cookie', cookies);
            expect(refreshRes.status).toBe(200);
            expect(refreshRes.body).toHaveProperty('accessToken');
        });
        it('deve retornar erro sem refresh token', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/auth/refresh');
            expect(res.status).toBe(401);
            expect(res.body.message).toContain('Refresh token não fornecido');
        });
    });
});
