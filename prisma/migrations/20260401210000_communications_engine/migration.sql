-- CreateTable: ReminderLog
CREATE TABLE "ReminderLog" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "companyId"   TEXT NOT NULL,
    "clientId"    TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceId"   TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "daysLeft"    INTEGER NOT NULL,
    "sentAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReminderLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ReminderLog_companyId_idx" ON "ReminderLog"("companyId");
CREATE INDEX "ReminderLog_serviceId_idx" ON "ReminderLog"("serviceId");

-- CreateTable: BusinessEmail
CREATE TABLE "BusinessEmail" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "clientId"  TEXT,
    "type"      TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'draft',
    "sentAt"    DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessEmail_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BusinessEmail_companyId_idx" ON "BusinessEmail"("companyId");
CREATE INDEX "BusinessEmail_clientId_idx" ON "BusinessEmail"("clientId");
CREATE INDEX "BusinessEmail_status_idx" ON "BusinessEmail"("status");
