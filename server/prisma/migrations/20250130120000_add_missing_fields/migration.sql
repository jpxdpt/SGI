-- Adicionar novos valores ao enum ActionStatus (se não existirem)
DO $$ 
BEGIN
    -- Adicionar EXECUTADA se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXECUTADA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) THEN
        ALTER TYPE "ActionStatus" ADD VALUE 'EXECUTADA';
    END IF;
    -- Adicionar EXECUTADA_ATRASO se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXECUTADA_ATRASO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) THEN
        ALTER TYPE "ActionStatus" ADD VALUE 'EXECUTADA_ATRASO';
    END IF;
    -- Adicionar ANDAMENTO se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ANDAMENTO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) THEN
        ALTER TYPE "ActionStatus" ADD VALUE 'ANDAMENTO';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Atualizar valores antigos do enum ActionStatus (apenas se existirem)
DO $$ 
BEGIN
    -- Atualizar CONCLUIDA para EXECUTADA (se o valor EXECUTADA já existir no enum)
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXECUTADA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) 
       AND EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONCLUIDA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) THEN
        UPDATE "ActionItem" SET "status" = 'EXECUTADA' WHERE "status"::text = 'CONCLUIDA';
    END IF;
    -- Atualizar EM_ANDAMENTO para ANDAMENTO (se o valor ANDAMENTO já existir no enum)
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ANDAMENTO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) 
       AND EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EM_ANDAMENTO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) THEN
        UPDATE "ActionItem" SET "status" = 'ANDAMENTO' WHERE "status"::text = 'EM_ANDAMENTO';
    END IF;
END $$;

-- Adicionar novas colunas às auditorias (se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'iso') THEN
        ALTER TABLE "InternalAudit" ADD COLUMN "iso" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'inicio') THEN
        ALTER TABLE "InternalAudit" ADD COLUMN "inicio" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'termino') THEN
        ALTER TABLE "InternalAudit" ADD COLUMN "termino" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'iso') THEN
        ALTER TABLE "ExternalAudit" ADD COLUMN "iso" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'inicio') THEN
        ALTER TABLE "ExternalAudit" ADD COLUMN "inicio" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'termino') THEN
        ALTER TABLE "ExternalAudit" ADD COLUMN "termino" TIMESTAMP(3);
    END IF;
END $$;

-- Criar enum Conformidade se não existir
DO $$ BEGIN
    CREATE TYPE "Conformidade" AS ENUM ('CONFORMIDADE', 'NAO_CONFORMIDADE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna conformidade ao ActionItem (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'conformidade') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "conformidade" "Conformidade";
    END IF;
    
    -- Adicionar novas colunas ao ActionItem (se não existirem)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'numeroAssociado') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "numeroAssociado" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'ambito') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "ambito" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'causaRaizIdentificada') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "causaRaizIdentificada" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'acaoCorretiva') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "acaoCorretiva" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'local') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "local" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'responsavel') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "responsavel" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'inicio') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "inicio" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'termino') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "termino" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'conclusao') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "conclusao" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'mes') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "mes" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'evidencia') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "evidencia" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionItem' AND column_name = 'avaliacaoEficacia') THEN
        ALTER TABLE "ActionItem" ADD COLUMN "avaliacaoEficacia" TEXT;
    END IF;
END $$;

-- Atualizar enum ActionStatus: remover valores antigos e adicionar novos (apenas se necessário)
DO $$
BEGIN
    -- Verificar se já existe o novo enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionStatus' AND 
                   (SELECT COUNT(*) FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ActionStatus')) = 4) THEN
        -- Criar novo tipo com os valores corretos
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionStatus') THEN
            ALTER TYPE "ActionStatus" RENAME TO "ActionStatus_old";
            CREATE TYPE "ActionStatus" AS ENUM ('EXECUTADA', 'EXECUTADA_ATRASO', 'ATRASADA', 'ANDAMENTO');
            ALTER TABLE "ActionItem" ALTER COLUMN "status" TYPE "ActionStatus" USING "status"::text::"ActionStatus";
            DROP TYPE "ActionStatus_old";
        ELSE
            CREATE TYPE "ActionStatus" AS ENUM ('EXECUTADA', 'EXECUTADA_ATRASO', 'ATRASADA', 'ANDAMENTO');
        END IF;
    END IF;
END $$;

-- Remover colunas antigas das auditorias (se necessário, comentado para evitar perda de dados)
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "setor";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "responsavel";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "descricao";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "status";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "classificacao";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "numeroAssociado";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "ambito";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "causaRaizIdentificada";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "acaoCorretiva";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "local";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "mes";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "evidencia";
-- ALTER TABLE "InternalAudit" DROP COLUMN IF EXISTS "avaliacaoEficacia";

-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "setor";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "responsavel";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "descricao";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "status";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "classificacao";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "numeroAssociado";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "ambito";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "causaRaizIdentificada";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "acaoCorretiva";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "local";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "mes";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "evidencia";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "avaliacaoEficacia";
-- ALTER TABLE "ExternalAudit" DROP COLUMN IF EXISTS "conclusao";

