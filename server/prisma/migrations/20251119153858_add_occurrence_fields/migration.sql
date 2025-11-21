-- CreateEnum
CREATE TYPE "OccurrenceType" AS ENUM ('AMBIENTAL', 'SEGURANCA_TRABALHADORES', 'SEGURANCA_ALIMENTAR');

-- AlterTable
ALTER TABLE "Occurrence" ADD COLUMN "tipo" "OccurrenceType" NOT NULL DEFAULT 'AMBIENTAL';
ALTER TABLE "Occurrence" ADD COLUMN "departamentosAtingidos" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Occurrence" ADD COLUMN "resolucao" TEXT;

-- Update existing records to have default values
UPDATE "Occurrence" SET "departamentosAtingidos" = jsonb_build_array("setor") WHERE "departamentosAtingidos" = '[]' OR "departamentosAtingidos" IS NULL;

-- Remove default after setting values for existing records
ALTER TABLE "Occurrence" ALTER COLUMN "tipo" DROP DEFAULT;


