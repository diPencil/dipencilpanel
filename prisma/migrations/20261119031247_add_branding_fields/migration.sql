-- AlterTable
ALTER TABLE `company` ADD COLUMN `dipencilLogo` LONGTEXT NULL,
    ADD COLUMN `favicon` LONGTEXT NULL,
    ADD COLUMN `loginLogo` LONGTEXT NULL,
    ADD COLUMN `projectName` VARCHAR(191) NULL DEFAULT 'diPencil Panel';
