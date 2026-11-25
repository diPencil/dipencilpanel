-- AlterTable
ALTER TABLE `company` ADD COLUMN `clientInvoiceFooterLeft` TEXT NULL,
    ADD COLUMN `clientInvoiceFooterRight` TEXT NULL,
    ADD COLUMN `dipencilFooterLeft` TEXT NULL,
    ADD COLUMN `dipencilFooterRight` TEXT NULL,
    ADD COLUMN `dipencilSellerLines` TEXT NULL,
    ADD COLUMN `dipencilSellerName` TEXT NULL;
