// Vercel Serverless Function Handler
// Este ficheiro exporta a aplicação Express para o Vercel
// Nota: O Vercel compila TypeScript automaticamente
import app from '../src/server';
import type { Request, Response } from 'express';

// Handler customizado que garante CORS antes de tudo
// O Vercel passa requests/responses compatíveis com Express
export default function handler(req: Request, res: Response) {
  // Definir headers CORS ANTES de qualquer processamento
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas

  // Se for OPTIONS (preflight), responder imediatamente
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Passar para o Express
  return app(req, res);
}



