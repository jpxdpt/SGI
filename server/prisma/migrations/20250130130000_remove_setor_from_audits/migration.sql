-- Remover coluna setor das tabelas InternalAudit e ExternalAudit se existirem
DO $$ 
BEGIN
    -- Remover setor de InternalAudit se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'setor') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "setor";
    END IF;
    
    -- Remover setor de ExternalAudit se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'setor') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "setor";
    END IF;
    
    -- Remover outras colunas antigas que não estão mais no schema
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'responsavel') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "responsavel";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'descricao') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "descricao";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'status') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "status";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'classificacao') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "classificacao";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'numeroAssociado') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "numeroAssociado";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'ambito') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "ambito";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'causaRaizIdentificada') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "causaRaizIdentificada";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'acaoCorretiva') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "acaoCorretiva";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'local') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "local";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'mes') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "mes";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'evidencia') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "evidencia";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'avaliacaoEficacia') THEN
        ALTER TABLE "InternalAudit" DROP COLUMN "avaliacaoEficacia";
    END IF;
    
    -- Remover colunas antigas de ExternalAudit
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'responsavel') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "responsavel";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'descricao') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "descricao";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'status') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "status";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'classificacao') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "classificacao";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'numeroAssociado') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "numeroAssociado";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'ambito') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "ambito";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'causaRaizIdentificada') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "causaRaizIdentificada";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'acaoCorretiva') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "acaoCorretiva";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'local') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "local";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'mes') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "mes";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'evidencia') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "evidencia";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'avaliacaoEficacia') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "avaliacaoEficacia";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ExternalAudit' AND column_name = 'conclusao') THEN
        ALTER TABLE "ExternalAudit" DROP COLUMN "conclusao";
    END IF;
END $$;










