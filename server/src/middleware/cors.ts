import { Request, Response, NextFunction } from 'express';

/**
 * Middleware CORS robusto que garante headers corretos em todas as respostas
 * Funciona mesmo em ambiente serverless (Vercel)
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Permitir qualquer origem (para desenvolvimento/testes)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Se não houver origin header, permitir qualquer
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');

  // Se for um request OPTIONS (preflight), responder imediatamente
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

