import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  error: Error | ZodError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log do erro
  console.error('[Error Handler]', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Erros de validação Zod
  if (error instanceof ZodError) {
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
    const prismaError = error as any;
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
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  console.error('[Error Handler - Full Error]', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: (error as any).code,
    meta: (error as any).meta,
  });
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: isDev ? error.message : 'Ocorreu um erro inesperado.',
    stack: isDev && error.stack ? error.stack : undefined,
    code: isDev ? (error as any).code : undefined,
    meta: isDev ? (error as any).meta : undefined,
  });
};


