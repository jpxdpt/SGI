"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonSchemas = exports.validatePagination = exports.validateTenantId = exports.validateId = exports.sanitizeBody = exports.sanitizeString = void 0;
const zod_1 = require("zod");
// Sanitização básica de strings para prevenir XSS
const sanitizeString = (str) => {
    return str
        .replace(/[<>]/g, '') // Remove < e >
        .trim()
        .slice(0, 1000); // Limita tamanho
};
exports.sanitizeString = sanitizeString;
// Middleware para sanitizar body
const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        const sanitize = (obj) => {
            if (typeof obj === 'string') {
                return (0, exports.sanitizeString)(obj);
            }
            if (Array.isArray(obj)) {
                return obj.map(sanitize);
            }
            if (obj && typeof obj === 'object') {
                const sanitized = {};
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
exports.sanitizeBody = sanitizeBody;
// Validação de ID (formato esperado)
const validateId = (req, res, next) => {
    const id = req.params.id;
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    next();
};
exports.validateId = validateId;
// Validação de tenant ID
const validateTenantId = (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId && typeof tenantId === 'string') {
        // Validar formato básico (sem caracteres perigosos)
        if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
            return res.status(400).json({ error: 'Tenant ID inválido' });
        }
    }
    next();
};
exports.validateTenantId = validateTenantId;
// Validação de paginação
const validatePagination = (req, res, next) => {
    const page = req.query.page;
    const limit = req.query.limit;
    if (page !== undefined) {
        const pageNum = parseInt(page, 10);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: 'Página deve ser um número positivo' });
        }
    }
    if (limit !== undefined) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({ error: 'Limit deve ser entre 1 e 100' });
        }
    }
    next();
};
exports.validatePagination = validatePagination;
// Schema Zod para validação de inputs comuns
exports.commonSchemas = {
    id: zod_1.z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
    tenantId: zod_1.z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
};
