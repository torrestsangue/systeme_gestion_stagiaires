-- AlterTable
ALTER TABLE `User` ADD COLUMN `codeExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `company` VARCHAR(191) NULL,
    ADD COLUMN `is_verify` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `refreshToken` TEXT NULL,
    ADD COLUMN `verificationCode` VARCHAR(191) NULL;
