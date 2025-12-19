import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { prisma } from './prisma';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { sanitizeBody, validateTenantId } from './middleware/security';
import { requestLogger } from './middleware/logger';
import { authenticateToken, AuthRequest } from './middleware/auth';
import { setupSwagger } from './config/swagger';
import { reportScheduler } from './services/reportScheduler';
import { corsMiddleware } from './middleware/cors';
import { fetchDashboardSummary } from './services/dataFetcher';
import { getTenantId, buildPath } from './utils/helpers';

// Importar Rotas
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import logsRoutes from './routes/logs';
import attachmentsRoutes from './routes/attachments';
import commentsRoutes from './routes/comments';
import approvalsRoutes from './routes/approvals';
import workflowsRoutes from './routes/workflows';
import documentsRoutes from './routes/documents';
import reportsRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';
import rootCauseAnalysisRoutes from './routes/rootCauseAnalysis';
import auditProgramsRoutes from './routes/auditPrograms';
import auditsRoutes from './routes/audits';
import actionsRoutes from './routes/actions';
import occurrencesRoutes from './routes/occurrences';
import sectorsRoutes from './routes/sectors';
import importRoutes from './routes/import';

const app = express();

const PORT = Number(process.env.PORT ?? 5801);
const BASE_PATH = process.env.BASE_PATH ?? '/api';

// Configurar trust proxy
app.set('trust proxy', true);

// CORS
app.use(corsMiddleware);
app.use(cors({
  credentials: true,
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
}));

// SEGURANÇA
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(compression());
app.use(generalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(sanitizeBody);
app.use(validateTenantId);
app.use(requestLogger);

// Swagger
setupSwagger(app);

// Rotas Base & Health
app.use('/', healthRoutes);
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'SGI Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      api: '/api',
      docs: '/api/docs'
    }
  });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

// API Routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/logs', authenticateToken, logsRoutes);
apiRouter.use('/attachments', authenticateToken, attachmentsRoutes);
apiRouter.use('/comments', authenticateToken, commentsRoutes);
apiRouter.use('/approvals', authenticateToken, approvalsRoutes);
apiRouter.use('/workflows', authenticateToken, workflowsRoutes);
apiRouter.use('/documents', authenticateToken, documentsRoutes);
apiRouter.use('/reports', authenticateToken, reportsRoutes);
apiRouter.use('/analytics', authenticateToken, analyticsRoutes);
apiRouter.use('/root-cause-analysis', authenticateToken, rootCauseAnalysisRoutes);
apiRouter.use('/audit-programs', authenticateToken, auditProgramsRoutes);
apiRouter.use('/audits', auditsRoutes);
apiRouter.use('/actions', actionsRoutes);
apiRouter.use('/occurrences', occurrencesRoutes);
apiRouter.use('/sectors', sectorsRoutes);
apiRouter.use('/import', importRoutes);

apiRouter.get('/summary', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const summary = await fetchDashboardSummary(tenantId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.use(BASE_PATH, apiRouter);

// Error Handling
app.use(errorHandler);

// Iniciar scheduler
if (process.env.ENABLE_REPORT_SCHEDULER !== 'false') {
  reportScheduler.start();
  console.log('[Server] Report scheduler iniciado.');
}

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SGI backend a correr em http://0.0.0.0:${PORT}${BASE_PATH}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('[Server] Encerrando servidor...');
  reportScheduler.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
