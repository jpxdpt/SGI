import rateLimit from 'express-rate-limit';

// Rate limiter geral para todas as rotas
// Em desenvolvimento, permite mais requisições para suportar polling frequente
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto (reduzido de 15 minutos)
  max: process.env.NODE_ENV === 'production' ? 100 : 300, // 300 em dev, 100 em prod
  message: 'Demasiadas requisições deste IP, tenta novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Ignorar requests OPTIONS (preflight CORS)
    return req.method === 'OPTIONS';
  },
});

// Rate limiter mais restritivo para autenticação
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP por janela
  message: 'Demasiadas tentativas de login, tenta novamente em 15 minutos.',
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  skip: (req) => {
    // Ignorar requests OPTIONS (preflight CORS)
    return req.method === 'OPTIONS';
  },
});

// Rate limiter para criação de recursos (POST/PUT)
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 criações por IP por minuto
  message: 'Demasiadas operações de criação, aguarda um momento.',
});

// Rate limiter para operações de importação
export const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 importações por IP por hora
  message: 'Limite de importações atingido, tenta novamente mais tarde.',
});




