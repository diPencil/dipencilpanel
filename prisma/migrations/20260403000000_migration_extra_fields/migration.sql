-- AlterTable: add port, notes, errorMessage to WebsiteMigration
ALTER TABLE "WebsiteMigration" ADD COLUMN "port" INTEGER NOT NULL DEFAULT 22;
ALTER TABLE "WebsiteMigration" ADD COLUMN "notes" TEXT;
ALTER TABLE "WebsiteMigration" ADD COLUMN "errorMessage" TEXT;
