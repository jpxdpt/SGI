import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant-default';

export const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? DEFAULT_TENANT_ID;
};

export const notFound = (res: Response, message = 'Registo não encontrado') => 
  res.status(404).json({ message });

export const buildPath = (segment: string) => segment; // The base path /api is handled at router level
