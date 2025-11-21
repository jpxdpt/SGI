import { prisma } from '../prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './auth';

// Gestão de sessões de utilizador
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Cache de sessões em memória (em produção, usar Redis)
const activeSessions = new Map<string, SessionData>();

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
export const createSession = (data: Omit<SessionData, 'lastActivity'>, refreshToken: string): void => {
  activeSessions.set(refreshToken, {
    ...data,
    lastActivity: new Date(),
  });
};

/**
 * Atualizar atividade da sessão
 */
export const updateSessionActivity = (refreshToken: string): boolean => {
  const session = activeSessions.get(refreshToken);
  if (session) {
    session.lastActivity = new Date();
    return true;
  }
  return false;
};

/**
 * Verificar se a sessão está ativa
 */
export const isSessionActive = (refreshToken: string): boolean => {
  return activeSessions.has(refreshToken);
};

/**
 * Invalidar sessão (logout)
 */
export const invalidateSession = (refreshToken: string): void => {
  activeSessions.delete(refreshToken);
};

/**
 * Invalidar todas as sessões de um utilizador
 */
export const invalidateUserSessions = (userId: string): void => {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(token);
    }
  }
};

/**
 * Rotação de tokens - gera novos tokens e invalida o antigo
 */
export const rotateTokens = async (
  oldRefreshToken: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  // Verificar token antigo
  const payload = verifyRefreshToken(oldRefreshToken);
  if (!payload) {
    return null;
  }

  // Verificar se a sessão existe e está ativa
  if (!isSessionActive(oldRefreshToken)) {
    return null;
  }

  // Verificar se o utilizador ainda existe
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, tenantId: true },
  });

  if (!user) {
    invalidateSession(oldRefreshToken);
    return null;
  }

  // Gerar novos tokens
  const newAccessToken = generateAccessToken(user.id, user.email, user.role, user.tenantId);
  const newRefreshToken = generateRefreshToken(user.id, user.email, user.role, user.tenantId);

  // Invalidar sessão antiga
  invalidateSession(oldRefreshToken);

  // Criar nova sessão
  createSession(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      ipAddress,
      userAgent,
    },
    newRefreshToken,
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Obter informações da sessão
 */
export const getSessionInfo = (refreshToken: string): SessionData | null => {
  return activeSessions.get(refreshToken) || null;
};





