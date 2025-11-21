import { prisma } from '../prisma';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPORT';

interface AuditLogData {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Regista uma entrada no audit trail de forma assíncrona
 * Não bloqueia a operação principal em caso de erro
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditTrail.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        description: data.description,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      },
    });
  } catch (error) {
    // Não propagar erro para não interromper a operação principal
    console.error('[AUDIT_TRAIL] Erro ao registrar log:', error);
  }
}

/**
 * Helper para criar logs de forma mais simples
 */
export function createAuditLogger(tenantId: string, userId?: string) {
  return {
    log: (action: AuditAction, entity: string, description: string, entityId?: string, metadata?: Record<string, any>) => {
      return logAudit({
        tenantId,
        userId,
        action,
        entity,
        entityId,
        description,
        metadata,
      });
    },
    create: (entity: string, description: string, entityId?: string, metadata?: Record<string, any>) => {
      return logAudit({
        tenantId,
        userId,
        action: 'CREATE',
        entity,
        entityId,
        description,
        metadata,
      });
    },
    update: (entity: string, description: string, entityId?: string, metadata?: Record<string, any>) => {
      return logAudit({
        tenantId,
        userId,
        action: 'UPDATE',
        entity,
        entityId,
        description,
        metadata,
      });
    },
    delete: (entity: string, description: string, entityId?: string, metadata?: Record<string, any>) => {
      return logAudit({
        tenantId,
        userId,
        action: 'DELETE',
        entity,
        entityId,
        description,
        metadata,
      });
    },
  };
}

