-- CreateTable
CREATE TABLE "document_read_confirmations" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "document_read_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_read_confirmations_documentId_userId_key" ON "document_read_confirmations"("documentId", "userId");

-- CreateIndex
CREATE INDEX "document_read_confirmations_documentId_idx" ON "document_read_confirmations"("documentId");

-- CreateIndex
CREATE INDEX "document_read_confirmations_userId_idx" ON "document_read_confirmations"("userId");

-- CreateIndex
CREATE INDEX "document_read_confirmations_tenantId_idx" ON "document_read_confirmations"("tenantId");

-- AddForeignKey
ALTER TABLE "document_read_confirmations" ADD CONSTRAINT "document_read_confirmations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_read_confirmations" ADD CONSTRAINT "document_read_confirmations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_read_confirmations" ADD CONSTRAINT "document_read_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;







