"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
exports.createAuditLogger = createAuditLogger;
const prisma_1 = require("../prisma");
/**
 * Regista uma entrada no audit trail de forma assíncrona
 * Não bloqueia a operação principal em caso de erro
 */
async function logAudit(data) {
    try {
        await prisma_1.prisma.auditTrail.create({
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
    }
    catch (error) {
        // Não propagar erro para não interromper a operação principal
        console.error('[AUDIT_TRAIL] Erro ao registrar log:', error);
    }
}
/**
 * Helper para criar logs de forma mais simples
 */
function createAuditLogger(tenantId, userId) {
    return {
        log: (action, entity, description, entityId, metadata) => {
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
        create: (entity, description, entityId, metadata) => {
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
        update: (entity, description, entityId, metadata) => {
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
        delete: (entity, description, entityId, metadata) => {
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
