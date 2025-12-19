import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Diretório para armazenar ficheiros enviados
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

// Garantir que o diretório existe
const ensureUploadDir = () => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn('[Upload] Não foi possível criar diretório de uploads:', error);
  }
};

ensureUploadDir();

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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Criar subdiretório por tenant se possível
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const tenantDir = path.join(UPLOAD_DIR, tenantId);
      
      // Tentar criar diretório do tenant
      try {
        if (!fs.existsSync(tenantDir)) {
          fs.mkdirSync(tenantDir, { recursive: true });
        }
      } catch (error) {
        console.warn('[Upload] Não foi possível criar diretório do tenant:', error);
      }
      
      cb(null, tenantDir);
    } catch (error) {
      // Se falhar, usar diretório base
      cb(null, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    // Gerar nome único: UUID + extensão original
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

// Filtro de ficheiros
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de ficheiro não permitido: ${file.mimetype}. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

// Configuração do multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export { UPLOAD_DIR };













