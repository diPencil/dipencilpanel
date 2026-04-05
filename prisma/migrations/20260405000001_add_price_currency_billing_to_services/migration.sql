-- AlterTable: add price, currency, billingCycle to Domain, Hosting, VPS, Email
ALTER TABLE "Domain"  ADD COLUMN "price"        DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Domain"  ADD COLUMN "currency"     TEXT             NOT NULL DEFAULT 'USD';
ALTER TABLE "Domain"  ADD COLUMN "billingCycle" TEXT             NOT NULL DEFAULT 'yearly';

ALTER TABLE "Hosting" ADD COLUMN "price"        DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Hosting" ADD COLUMN "currency"     TEXT             NOT NULL DEFAULT 'USD';
ALTER TABLE "Hosting" ADD COLUMN "billingCycle" TEXT             NOT NULL DEFAULT 'monthly';

ALTER TABLE "VPS"     ADD COLUMN "price"        DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "VPS"     ADD COLUMN "currency"     TEXT             NOT NULL DEFAULT 'USD';
ALTER TABLE "VPS"     ADD COLUMN "billingCycle" TEXT             NOT NULL DEFAULT 'monthly';

ALTER TABLE "Email"   ADD COLUMN "price"        DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Email"   ADD COLUMN "currency"     TEXT             NOT NULL DEFAULT 'USD';
ALTER TABLE "Email"   ADD COLUMN "billingCycle" TEXT             NOT NULL DEFAULT 'monthly';
