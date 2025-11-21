"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SGI API',
            version: '1.0.0',
            description: 'API REST para Sistema de Gestão Integrada (SGI)',
            contact: {
                name: 'Suporte SGI',
                email: 'suporte@sgi.local',
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:5801/api',
                description: 'Servidor de desenvolvimento',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Mensagem de erro',
                        },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'admin@demo.local',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            example: 'admin123',
                        },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        accessToken: {
                            type: 'string',
                            description: 'JWT access token (válido por 15 minutos)',
                        },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string', enum: ['ADMIN', 'GESTOR', 'AUDITOR'] },
                                tenantId: { type: 'string' },
                                tenant: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
                InternalAudit: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        ano: { type: 'integer' },
                        setor: { type: 'string' },
                        responsavel: { type: 'string' },
                        descricao: { type: 'string' },
                        dataPrevista: { type: 'string', format: 'date-time' },
                        execucao: { type: 'number' },
                        status: {
                            type: 'string',
                            enum: ['PLANEADA', 'EM_EXECUCAO', 'EXEC_ATRASO', 'ATRASADA', 'EXECUTADA'],
                        },
                        acoesGeradas: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ExternalAudit: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        ano: { type: 'integer' },
                        setor: { type: 'string' },
                        responsavel: { type: 'string' },
                        descricao: { type: 'string' },
                        dataPrevista: { type: 'string', format: 'date-time' },
                        execucao: { type: 'number' },
                        status: {
                            type: 'string',
                            enum: ['PLANEADA', 'EM_EXECUCAO', 'EXEC_ATRASO', 'ATRASADA', 'EXECUTADA'],
                        },
                        acoesGeradas: { type: 'integer' },
                        entidadeAuditora: { type: 'string' },
                        conclusoes: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ActionItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        origem: {
                            type: 'string',
                            enum: ['INTERNA', 'EXTERNA', 'OCORRENCIA'],
                        },
                        acaoRelacionada: { type: 'string' },
                        setor: { type: 'string' },
                        descricao: { type: 'string' },
                        dataAbertura: { type: 'string', format: 'date-time' },
                        dataLimite: { type: 'string', format: 'date-time' },
                        dataConclusao: { type: 'string', format: 'date-time' },
                        impacto: {
                            type: 'string',
                            enum: ['BAIXO', 'MEDIO', 'ALTO'],
                        },
                        status: {
                            type: 'string',
                            enum: ['CONCLUIDA', 'EM_ANDAMENTO', 'ATRASADA'],
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Occurrence: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        setor: { type: 'string' },
                        responsavel: { type: 'string' },
                        data: { type: 'string', format: 'date-time' },
                        descricao: { type: 'string' },
                        gravidade: {
                            type: 'string',
                            enum: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'],
                        },
                        acaoGerada: { type: 'string' },
                        status: {
                            type: 'string',
                            enum: ['ABERTA', 'EM_MITIGACAO', 'RESOLVIDA'],
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Sector: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        nome: { type: 'string' },
                        responsavel: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        telefone: { type: 'string' },
                        descricao: { type: 'string' },
                        ativo: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Autenticação',
                description: 'Endpoints de autenticação e gestão de utilizadores',
            },
            {
                name: 'Auditorias Internas',
                description: 'Gestão de auditorias internas',
            },
            {
                name: 'Auditorias Externas',
                description: 'Gestão de auditorias externas',
            },
            {
                name: 'Ações',
                description: 'Gestão de ações geradas',
            },
            {
                name: 'Ocorrências',
                description: 'Gestão de ocorrências internas',
            },
            {
                name: 'Setores',
                description: 'Gestão de setores',
            },
            {
                name: 'Importação',
                description: 'Importação em massa de dados',
            },
            {
                name: 'Health',
                description: 'Health checks e status do sistema',
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/server.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'SGI API Documentation',
    }));
    app.get('/docs.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};
exports.setupSwagger = setupSwagger;
