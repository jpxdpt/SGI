"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_DIR = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
// Diretório para armazenar ficheiros enviados
const UPLOAD_DIR = process.env.UPLOAD_DIR || path_1.default.join(process.cwd(), 'uploads');
exports.UPLOAD_DIR = UPLOAD_DIR;
// Garantir que o diretório existe
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
];
// Limite de tamanho: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Configuração do storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Criar subdiretório por tenant se possível
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const tenantDir = path_1.default.join(UPLOAD_DIR, tenantId);
        if (!fs_1.default.existsSync(tenantDir)) {
            fs_1.default.mkdirSync(tenantDir, { recursive: true });
        }
        cb(null, tenantDir);
    },
    filename: (req, file, cb) => {
        // Gerar nome único: UUID + extensão original
        const ext = path_1.default.extname(file.originalname);
        const filename = `${(0, uuid_1.v4)()}${ext}`;
        cb(null, filename);
    },
});
// Filtro de ficheiros
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Tipo de ficheiro não permitido: ${file.mimetype}. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
};
// Configuração do multer
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
});
