-- Adicionar campo entidadeAuditora à tabela InternalAudit (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InternalAudit' AND column_name = 'entidadeAuditora') THEN
        ALTER TABLE "InternalAudit" ADD COLUMN "entidadeAuditora" TEXT;
    END IF;
END $$;




