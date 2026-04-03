-- Migrate legacy platform value to Windows
UPDATE "MobileApp" SET "appType" = 'windows' WHERE "appType" = 'cross_platform';
