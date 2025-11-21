import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

interface LogData {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
}

/**
 * Logger estruturado para requisições
 */
export const requestLogger = (req: Request | AuthRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capturar dados da requisição
  const logData: LogData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: (req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress)?.toString(),
    userAgent: req.headers['user-agent'],
  };

  // Adicionar dados de autenticação se disponíveis
  if ('user' in req && req.user) {
    logData.userId = req.user.id;
    logData.tenantId = req.user.tenantId;
  } else {
    // Tentar obter tenant do header
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId) {
      logData.tenantId = tenantId as string;
    }
  }

  // Interceptar resposta para registrar status e duração
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;
    logData.statusCode = res.statusCode;
    logData.duration = duration;

    // Log baseado no status code
    if (res.statusCode >= 500) {
      console.error('[REQUEST_ERROR]', JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      console.warn('[REQUEST_WARN]', JSON.stringify(logData));
    } else {
      console.log('[REQUEST]', JSON.stringify(logData));
    }

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Logger de erros (middleware para capturar erros não tratados)
 */
export const errorLogger = (error: Error, req: Request | AuthRequest, res: Response, next: NextFunction): void => {
  const logData: LogData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: res.statusCode || 500,
    error: error.message,
    ip: (req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress)?.toString(),
    userAgent: req.headers['user-agent'],
  };

  if ('user' in req && req.user) {
    logData.userId = req.user.id;
    logData.tenantId = req.user.tenantId;
  }

  console.error('[ERROR]', JSON.stringify({
    ...logData,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  }));

  // Passar erro para o próximo middleware
  next(error);
};

