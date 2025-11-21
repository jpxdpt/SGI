import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Sanitização básica de strings para prevenir XSS
export const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>]/g, '') // Remove < e >
    .trim()
    .slice(0, 1000); // Limita tamanho
};

// Middleware para sanitizar body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key] = sanitize(obj[key]);
          }
        }
        return sanitized;
      }
      return obj;
    };
    req.body = sanitize(req.body);
  }
  next();
};

// Validação de ID (formato esperado)
export const validateId = (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  next();
};

// Validação de tenant ID
export const validateTenantId = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'];
  if (tenantId && typeof tenantId === 'string') {
    // Validar formato básico (sem caracteres perigosos)
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      return res.status(400).json({ error: 'Tenant ID inválido' });
    }
  }
  next();
};

// Validação de paginação
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = req.query.page;
  const limit = req.query.limit;
  
  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Página deve ser um número positivo' });
    }
  }
  
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Limit deve ser entre 1 e 100' });
    }
  }
  
  next();
};

// Schema Zod para validação de inputs comuns
export const commonSchemas = {
  id: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  tenantId: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

