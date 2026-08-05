-- AlterTable
ALTER TABLE `Contract` ADD COLUMN `signingToken` VARCHAR(191) NULL,
    ADD COLUMN `validationCode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ContractSignature` (
    `id` VARCHAR(191) NOT NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `signerName` VARCHAR(191) NOT NULL,
    `signatureImage` LONGTEXT NOT NULL,
    `signedAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL DEFAULT '',
    `userAgent` TEXT NOT NULL,
    `tokenUsed` VARCHAR(191) NOT NULL,
    `contractVersion` INTEGER NOT NULL,
    `documentHash` VARCHAR(191) NOT NULL,
    `documentSnapshot` JSON NOT NULL,
    `validationCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ContractSignature_contractId_key`(`contractId`),
    UNIQUE INDEX `ContractSignature_validationCode_key`(`validationCode`),
    INDEX `ContractSignature_validationCode_idx`(`validationCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Contract_signingToken_key` ON `Contract`(`signingToken`);

-- CreateIndex
CREATE UNIQUE INDEX `Contract_validationCode_key` ON `Contract`(`validationCode`);

-- AddForeignKey
ALTER TABLE `ContractSignature` ADD CONSTRAINT `ContractSignature_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
