-- AlterTable
ALTER TABLE "Hosting" ADD COLUMN "domainId" TEXT;

-- CreateIndex
CREATE INDEX "Hosting_domainId_idx" ON "Hosting"("domainId");

-- AddForeignKey
ALTER TABLE "Hosting" ADD CONSTRAINT "Hosting_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
