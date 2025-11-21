"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticateToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production';
const generateAccessToken = (userId, email, role, tenantId) => {
    return jsonwebtoken_1.default.sign({ userId, email, role, tenantId }, JWT_SECRET, { expiresIn: '15m' });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId, email, role, tenantId) => {
    return jsonwebtoken_1.default.sign({ userId, email, role, tenantId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
    }
    catch {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        res.status(401).json({ message: 'Token de acesso não fornecido.' });
        return;
    }
    const payload = (0, exports.verifyAccessToken)(token);
    if (!payload) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
        return;
    }
    // Verificar se o utilizador ainda existe
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true, tenantId: true },
    });
    if (!user) {
        res.status(403).json({ message: 'Utilizador não encontrado.' });
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
exports.authenticateToken = authenticateToken;
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
