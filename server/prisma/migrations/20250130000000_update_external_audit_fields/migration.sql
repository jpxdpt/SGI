-- AlterTable
ALTER TABLE "ExternalAudit" DROP COLUMN "dataPrevista",
DROP COLUMN "execucao",
DROP COLUMN "acoesGeradas";

-- AlterEnum
ALTER TYPE "AuditoriaStatus" ADD VALUE 'ANDAMENTO';

-- AlterTable
ALTER TABLE "ExternalAudit" ADD COLUMN "classificacao" TEXT,
ADD COLUMN "numeroAssociado" TEXT,
ADD COLUMN "ambito" TEXT,
ADD COLUMN "causaRaizIdentificada" TEXT,
ADD COLUMN "acaoCorretiva" TEXT,
ADD COLUMN "local" TEXT,
ADD COLUMN "inicio" TIMESTAMP(3),
ADD COLUMN "termino" TIMESTAMP(3),
ADD COLUMN "conclusao" TIMESTAMP(3),
ADD COLUMN "mes" TEXT,
ADD COLUMN "evidencia" TEXT,
ADD COLUMN "avaliacaoEficacia" TEXT;





