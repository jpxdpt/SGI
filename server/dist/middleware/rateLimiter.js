"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importLimiter = exports.createLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiter geral para todas as rotas
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requisições por IP por janela
    message: 'Demasiadas requisições deste IP, tenta novamente mais tarde.',
});
// Rate limiter mais restritivo para autenticação
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas de login por IP por janela
    message: 'Demasiadas tentativas de login, tenta novamente em 15 minutos.',
    skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
});
// Rate limiter para criação de recursos (POST/PUT)
exports.createLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // máximo 10 criações por IP por minuto
    message: 'Demasiadas operações de criação, aguarda um momento.',
});
// Rate limiter para operações de importação
exports.importLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // máximo 5 importações por IP por hora
    message: 'Limite de importações atingido, tenta novamente mais tarde.',
});
