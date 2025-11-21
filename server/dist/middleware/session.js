"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionInfo = exports.rotateTokens = exports.invalidateUserSessions = exports.invalidateSession = exports.isSessionActive = exports.updateSessionActivity = exports.createSession = void 0;
const prisma_1 = require("../prisma");
const auth_1 = require("./auth");
// Cache de sessões em memória (em produção, usar Redis)
const activeSessions = new Map();
// Limpar sessões antigas periodicamente
setInterval(() => {
    const now = new Date();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutos
    for (const [token, session] of activeSessions.entries()) {
        if (now.getTime() - session.lastActivity.getTime() > maxIdleTime) {
            activeSessions.delete(token);
        }
    }
}, 60 * 1000); // Verificar a cada minuto
/**
 * Criar uma nova sessão
 */
const createSession = (data, refreshToken) => {
    activeSessions.set(refreshToken, {
        ...data,
        lastActivity: new Date(),
    });
};
exports.createSession = createSession;
/**
 * Atualizar atividade da sessão
 */
const updateSessionActivity = (refreshToken) => {
    const session = activeSessions.get(refreshToken);
    if (session) {
        session.lastActivity = new Date();
        return true;
    }
    return false;
};
exports.updateSessionActivity = updateSessionActivity;
/**
 * Verificar se a sessão está ativa
 */
const isSessionActive = (refreshToken) => {
    return activeSessions.has(refreshToken);
};
exports.isSessionActive = isSessionActive;
/**
 * Invalidar sessão (logout)
 */
const invalidateSession = (refreshToken) => {
    activeSessions.delete(refreshToken);
};
exports.invalidateSession = invalidateSession;
/**
 * Invalidar todas as sessões de um utilizador
 */
const invalidateUserSessions = (userId) => {
    for (const [token, session] of activeSessions.entries()) {
        if (session.userId === userId) {
            activeSessions.delete(token);
        }
    }
};
exports.invalidateUserSessions = invalidateUserSessions;
/**
 * Rotação de tokens - gera novos tokens e invalida o antigo
 */
const rotateTokens = async (oldRefreshToken, ipAddress, userAgent) => {
    // Verificar token antigo
    const payload = (0, auth_1.verifyRefreshToken)(oldRefreshToken);
    if (!payload) {
        return null;
    }
    // Verificar se a sessão existe e está ativa
    if (!(0, exports.isSessionActive)(oldRefreshToken)) {
        return null;
    }
    // Verificar se o utilizador ainda existe
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true, tenantId: true },
    });
    if (!user) {
        (0, exports.invalidateSession)(oldRefreshToken);
        return null;
    }
    // Gerar novos tokens
    const newAccessToken = (0, auth_1.generateAccessToken)(user.id, user.email, user.role, user.tenantId);
    const newRefreshToken = (0, auth_1.generateRefreshToken)(user.id, user.email, user.role, user.tenantId);
    // Invalidar sessão antiga
    (0, exports.invalidateSession)(oldRefreshToken);
    // Criar nova sessão
    (0, exports.createSession)({
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        ipAddress,
        userAgent,
    }, newRefreshToken);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};
exports.rotateTokens = rotateTokens;
/**
 * Obter informações da sessão
 */
const getSessionInfo = (refreshToken) => {
    return activeSessions.get(refreshToken) || null;
};
exports.getSessionInfo = getSessionInfo;
