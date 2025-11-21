"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errorHandler = (error, req, res, next) => {
    // Log do erro
    console.error('[Error Handler]', {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        path: req.path,
        method: req.method,
    });
    // Erros de validação Zod
    if (error instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Erro de validação',
            details: error.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
    }
    // Erros do Prisma
    if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error;
        if (prismaError.code === 'P2002') {
            return res.status(409).json({
                error: 'Registo duplicado',
                message: 'Já existe um registo com estes dados.',
            });
        }
        if (prismaError.code === 'P2025') {
            return res.status(404).json({
                error: 'Registo não encontrado',
                message: 'O registo solicitado não existe.',
            });
        }
    }
    // Erro genérico
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Ocorreu um erro inesperado.',
    });
};
exports.errorHandler = errorHandler;
