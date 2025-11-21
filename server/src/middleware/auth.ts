import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production';

export const generateAccessToken = (userId: string, email: string, role: string, tenantId: string): string => {
  return jwt.sign({ userId, email, role, tenantId }, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string, email: string, role: string, tenantId: string): string => {
  return jwt.sign({ userId, email, role, tenantId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): { userId: string; email: string; role: string; tenantId: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string; tenantId: string };
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): { userId: string; email: string; role: string; tenantId: string } | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; email: string; role: string; tenantId: string };
  } catch {
    return null;
  }
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: 'Token de acesso não fornecido.' });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
    return;
  }

  // Verificar se o utilizador ainda existe
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, tenantId: true },
  });

  if (!user) {
    res.status(401).json({ message: 'Utilizador não encontrado.' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };

  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Autenticação necessária.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Permissão insuficiente para esta operação.' });
      return;
    }

    next();
  };
};

