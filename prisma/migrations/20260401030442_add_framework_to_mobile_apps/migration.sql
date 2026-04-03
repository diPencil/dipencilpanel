-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MobileApp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "appType" TEXT NOT NULL,
    "framework" TEXT NOT NULL DEFAULT 'native',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'development',
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "price" REAL NOT NULL DEFAULT 0,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "expiryDate" DATETIME,
    "domainId" TEXT,
    "hostingId" TEXT,
    "vpsId" TEXT,
    "emailIds" TEXT NOT NULL DEFAULT '[]',
    "clientId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MobileApp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MobileApp_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MobileApp_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MobileApp" ("appType", "autoRenew", "billingCycle", "clientId", "companyId", "createdAt", "description", "domainId", "emailIds", "expiryDate", "hostingId", "id", "name", "plan", "price", "status", "subscriptionId", "updatedAt", "vpsId") SELECT "appType", "autoRenew", "billingCycle", "clientId", "companyId", "createdAt", "description", "domainId", "emailIds", "expiryDate", "hostingId", "id", "name", "plan", "price", "status", "subscriptionId", "updatedAt", "vpsId" FROM "MobileApp";
DROP TABLE "MobileApp";
ALTER TABLE "new_MobileApp" RENAME TO "MobileApp";
CREATE UNIQUE INDEX "MobileApp_subscriptionId_key" ON "MobileApp"("subscriptionId");
CREATE INDEX "MobileApp_clientId_idx" ON "MobileApp"("clientId");
CREATE INDEX "MobileApp_companyId_idx" ON "MobileApp"("companyId");
CREATE INDEX "MobileApp_status_idx" ON "MobileApp"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
