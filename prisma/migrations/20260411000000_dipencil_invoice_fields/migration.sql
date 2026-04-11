-- AlterTable
ALTER TABLE "Client" ADD COLUMN "isDipencilInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "invoiceKind" TEXT NOT NULL DEFAULT 'client';
ALTER TABLE "Invoice" ADD COLUMN "counterpartyName" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "counterpartyAddress" TEXT;
