-- CreateTable
CREATE TABLE "MobileApp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "appType" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "WebsiteMigration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceIp" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'cpanel',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "logs" TEXT NOT NULL DEFAULT '[]',
    "dataSize" REAL NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebsiteMigration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileApp_subscriptionId_key" ON "MobileApp"("subscriptionId");

-- CreateIndex
CREATE INDEX "MobileApp_clientId_idx" ON "MobileApp"("clientId");

-- CreateIndex
CREATE INDEX "MobileApp_companyId_idx" ON "MobileApp"("companyId");

-- CreateIndex
CREATE INDEX "MobileApp_status_idx" ON "MobileApp"("status");

-- CreateIndex
CREATE INDEX "WebsiteMigration_companyId_idx" ON "WebsiteMigration"("companyId");

-- CreateIndex
CREATE INDEX "WebsiteMigration_status_idx" ON "WebsiteMigration"("status");
