-- CreateEnum
CREATE TYPE "RootCauseAnalysisType" AS ENUM ('ISHIKAWA', 'FTA', 'FIVE_WHYS');

-- CreateTable
CREATE TABLE "root_cause_analyses" (
    "id" TEXT NOT NULL,
    "actionItemId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisType" "RootCauseAnalysisType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "root_cause_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "root_cause_analyses_actionItemId_key" ON "root_cause_analyses"("actionItemId");

-- CreateIndex
CREATE INDEX "root_cause_analyses_actionItemId_idx" ON "root_cause_analyses"("actionItemId");

-- CreateIndex
CREATE INDEX "root_cause_analyses_tenantId_idx" ON "root_cause_analyses"("tenantId");

-- AddForeignKey
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;







