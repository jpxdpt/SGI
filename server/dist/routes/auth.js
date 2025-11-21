"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const password_1 = require("../utils/password");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const session_1 = require("../middleware/session");
const auditTrail_1 = require("../utils/auditTrail");
const router = (0, express_1.Router)();
// Aplicar rate limiting nas rotas de autenticação
router.use(rateLimiter_1.authLimiter);
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registar novo utilizador (apenas para administradores)
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, GESTOR, AUDITOR]
 *               tenantId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilizador registado com sucesso
 *       400:
 *         description: Dados incompletos
 *       403:
 *         description: Sem permissão para registar utilizadores
 *       409:
 *         description: Email já está em uso
 */
router.post('/register', auth_2.authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Apenas administradores podem registar novos utilizadores.' });
            return;
        }
        const { name, email, password, role, tenantId } = req.body;
        if (!name || !email || !password || !role) {
            res.status(400).json({ message: 'Dados incompletos (name, email, password, role são obrigatórios).' });
            return;
        }
        const targetTenantId = tenantId || req.user.tenantId;
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ message: 'Email já está em uso.' });
            return;
        }
        const passwordHash = await (0, password_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role.toUpperCase(),
                tenantId: targetTenantId,
            },
        });
        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        });
    }
    catch (error) {
        console.error('[AUTH_REGISTER_ERROR]', error);
        res.status(500).json({ message: 'Erro ao registar utilizador.' });
    }
});
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Fazer login
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email e palavra-passe são obrigatórios.' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: { tenant: true },
        });
        if (!user) {
            res.status(401).json({ message: 'Credenciais inválidas.' });
            return;
        }
        const validPassword = await (0, password_1.comparePassword)(password, user.passwordHash);
        if (!validPassword) {
            res.status(401).json({ message: 'Credenciais inválidas.' });
            return;
        }
        const accessToken = (0, auth_1.generateAccessToken)(user.id, user.email, user.role, user.tenantId);
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id, user.email, user.role, user.tenantId);
        // Criar sessão
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        (0, session_1.createSession)({
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            ipAddress,
            userAgent,
        }, refreshToken);
        // Guardar refresh token em cookie HTTP-only
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });
        // Registrar login no audit trail
        await (0, auditTrail_1.logAudit)({
            tenantId: user.tenantId,
            userId: user.id,
            action: 'LOGIN',
            entity: 'User',
            entityId: user.id,
            description: `Login realizado: ${user.email}`,
            metadata: {
                ipAddress,
                userAgent,
            },
        });
        res.json({
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                tenant: {
                    id: user.tenant.id,
                    name: user.tenant.name,
                },
            },
        });
    }
    catch (error) {
        console.error('[AUTH_LOGIN_ERROR]', error);
        res.status(500).json({ message: 'Erro ao fazer login.' });
    }
});
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar access token usando refresh token
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Novo access token gerado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Refresh token não fornecido ou inválido
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ message: 'Refresh token não fornecido.' });
            return;
        }
        // Atualizar atividade da sessão
        (0, session_1.updateSessionActivity)(refreshToken);
        // Rotacionar tokens (gera novos tokens e invalida o antigo)
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const tokens = await (0, session_1.rotateTokens)(refreshToken, ipAddress, userAgent);
        if (!tokens) {
            // Limpar cookie se o token for inválido
            res.clearCookie('refreshToken');
            res.status(403).json({ message: 'Refresh token inválido ou expirado.' });
            return;
        }
        // Guardar novo refresh token em cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });
        res.json({ accessToken: tokens.accessToken });
    }
    catch (error) {
        console.error('[AUTH_REFRESH_ERROR]', error);
        res.status(500).json({ message: 'Erro ao renovar token.' });
    }
});
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Fazer logout
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */
router.post('/logout', auth_2.authenticateToken, async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            // Invalidar sessão atual
            (0, session_1.invalidateSession)(refreshToken);
        }
        // Invalidar todas as sessões do utilizador
        if (req.user) {
            (0, session_1.invalidateUserSessions)(req.user.id);
            // Registrar logout no audit trail
            await (0, auditTrail_1.logAudit)({
                tenantId: req.user.tenantId,
                userId: req.user.id,
                action: 'LOGOUT',
                entity: 'User',
                entityId: req.user.id,
                description: `Logout realizado: ${req.user.email}`,
            });
        }
        res.clearCookie('refreshToken');
        res.json({ message: 'Logout realizado com sucesso.' });
    }
    catch (error) {
        console.error('[AUTH_LOGOUT_ERROR]', error);
        res.status(500).json({ message: 'Erro ao fazer logout.' });
    }
});
router.post('/logout-all', auth_2.authenticateToken, async (req, res) => {
    try {
        // Invalidar todas as sessões do utilizador
        if (req.user) {
            (0, session_1.invalidateUserSessions)(req.user.id);
        }
        res.clearCookie('refreshToken');
        res.json({ message: 'Logout de todos os dispositivos realizado com sucesso.' });
    }
    catch (error) {
        console.error('[AUTH_LOGOUT_ALL_ERROR]', error);
        res.status(500).json({ message: 'Erro ao fazer logout de todos os dispositivos.' });
    }
});
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obter dados do utilizador atual
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do utilizador
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Utilizador não encontrado
 */
router.get('/me', auth_2.authenticateToken, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                tenantId: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: 'Utilizador não encontrado.' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error('[AUTH_ME_ERROR]', error);
        res.status(500).json({ message: 'Erro ao obter dados do utilizador.' });
    }
});
exports.default = router;
