-- CreateTable
CREATE TABLE `Studio` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `owner` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `plan` ENUM('Essencial', 'Profissional', 'Studio') NOT NULL DEFAULT 'Profissional',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `period` ENUM('mensal', 'trimestral', 'semestral') NOT NULL,
    `frequency` INTEGER NOT NULL,
    `frequencyLabel` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Plan_studioId_idx`(`studioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Professional` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `registration` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Professional_studioId_idx`(`studioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudioHour` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `weekday` ENUM('Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado') NOT NULL,
    `open` VARCHAR(5) NOT NULL,
    `close` VARCHAR(5) NOT NULL,

    INDEX `StudioHour_studioId_idx`(`studioId`),
    UNIQUE INDEX `StudioHour_studioId_weekday_key`(`studioId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeSlot` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `period` ENUM('manha', 'tarde') NOT NULL,
    `time` VARCHAR(5) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 4,

    INDEX `TimeSlot_studioId_idx`(`studioId`),
    UNIQUE INDEX `TimeSlot_studioId_time_key`(`studioId`, `time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `birthDate` DATE NOT NULL,
    `sex` ENUM('Feminino', 'Masculino', 'Outro') NOT NULL,
    `cpf` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `address` TEXT NOT NULL,
    `emergencyContact` TEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `since` DATE NOT NULL,
    `objective` TEXT NOT NULL,
    `pathologies` TEXT NOT NULL,
    `injuries` TEXT NOT NULL,
    `surgeries` TEXT NOT NULL,
    `restrictions` TEXT NOT NULL,
    `medications` TEXT NOT NULL,
    `notes` TEXT NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `monthlyValue` DECIMAL(10, 2) NOT NULL,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `dueDay` INTEGER NOT NULL DEFAULT 10,
    `paymentMethod` ENUM('PIX', 'CartaoCredito', 'Boleto', 'Dinheiro') NOT NULL DEFAULT 'PIX',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Student_studioId_idx`(`studioId`),
    INDEX `Student_planId_idx`(`planId`),
    INDEX `Student_active_idx`(`active`),
    INDEX `Student_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleSlot` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `weekday` ENUM('Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado') NOT NULL,
    `time` VARCHAR(5) NOT NULL,

    INDEX `ScheduleSlot_studentId_idx`(`studentId`),
    UNIQUE INDEX `ScheduleSlot_studentId_weekday_time_key`(`studentId`, `weekday`, `time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `dueDate` DATE NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('pago', 'pendente', 'atrasado') NOT NULL DEFAULT 'pendente',
    `method` ENUM('PIX', 'CartaoCredito', 'Boleto', 'Dinheiro') NULL,
    `paidAt` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_studentId_idx`(`studentId`),
    INDEX `Payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhysicalAssessment` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `weight` DOUBLE NOT NULL,
    `height` DOUBLE NOT NULL,
    `bodyFat` DOUBLE NULL,
    `muscleMass` DOUBLE NULL,
    `armRight` DOUBLE NOT NULL,
    `armLeft` DOUBLE NOT NULL,
    `chest` DOUBLE NOT NULL,
    `waist` DOUBLE NOT NULL,
    `abdomen` DOUBLE NOT NULL,
    `hip` DOUBLE NOT NULL,
    `thighRight` DOUBLE NOT NULL,
    `thighLeft` DOUBLE NOT NULL,
    `calfRight` DOUBLE NOT NULL,
    `calfLeft` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhysicalAssessment_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evolution` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `professional` VARCHAR(191) NOT NULL,
    `clinical` TEXT NOT NULL,
    `complaints` TEXT NOT NULL,
    `improvements` TEXT NOT NULL,
    `exercises` TEXT NOT NULL,
    `conduct` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Evolution_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvolutionPhoto` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EvolutionPhoto_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contract` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `planLabel` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `status` ENUM('rascunho', 'pendente_assinatura', 'ativo', 'encerrado', 'cancelado') NOT NULL DEFAULT 'rascunho',
    `monthlyValue` DECIMAL(10, 2) NOT NULL,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `discountNote` VARCHAR(191) NULL,
    `dueDay` INTEGER NOT NULL,
    `paymentMethod` ENUM('PIX', 'CartaoCredito', 'Boleto', 'Dinheiro') NOT NULL,
    `financialResponsible` VARCHAR(191) NOT NULL,
    `lateFeePercent` DOUBLE NOT NULL DEFAULT 2,
    `interestPercent` DOUBLE NOT NULL DEFAULT 1,
    `clauses` JSON NOT NULL,
    `signedAt` DATE NULL,
    `signatureName` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `previousVersions` JSON NOT NULL,
    `history` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Contract_studentId_idx`(`studentId`),
    INDEX `Contract_studioId_idx`(`studioId`),
    UNIQUE INDEX `Contract_studioId_number_key`(`studioId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('aluguel', 'contas', 'pessoal', 'material', 'software', 'outros') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `dueDay` INTEGER NOT NULL,
    `status` ENUM('pago', 'pendente') NOT NULL DEFAULT 'pendente',
    `paidAt` DATE NULL,
    `recurring` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expense_studioId_idx`(`studioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('aniversarios', 'eventos', 'promocoes', 'marketing', 'whatsapp', 'email', 'fidelizacao', 'reativacao') NOT NULL,
    `channel` ENUM('whatsapp', 'email', 'sms', 'interno') NOT NULL,
    `audience` ENUM('todos', 'ativos', 'inativos', 'aniversariantes', 'inadimplentes', 'responsaveis') NOT NULL,
    `audienceLabel` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `scheduledAt` DATETIME(3) NULL,
    `status` ENUM('rascunho', 'agendada', 'em_andamento', 'pausada', 'finalizada') NOT NULL DEFAULT 'rascunho',
    `messageTemplate` TEXT NOT NULL,
    `variables` JSON NOT NULL,
    `attachments` JSON NOT NULL,
    `automation` ENUM('aniversario', 'lembrete', 'pos_venda', 'reativacao') NULL,
    `statsSent` INTEGER NOT NULL DEFAULT 0,
    `statsOpened` INTEGER NOT NULL DEFAULT 0,
    `statsClicked` INTEGER NOT NULL DEFAULT 0,
    `statsConverted` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Campaign_studioId_idx`(`studioId`),
    INDEX `Campaign_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassSession` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NULL,
    `guestName` VARCHAR(191) NULL,
    `date` DATE NOT NULL,
    `weekday` ENUM('Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado') NOT NULL,
    `time` VARCHAR(5) NOT NULL,
    `status` ENUM('agendada', 'presente', 'falta', 'reposicao', 'cancelada') NOT NULL DEFAULT 'agendada',
    `type` ENUM('fixa', 'avulsa', 'reposicao', 'experimental') NOT NULL DEFAULT 'fixa',
    `professionalId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassSession_studioId_date_idx`(`studioId`, `date`),
    INDEX `ClassSession_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Plan` ADD CONSTRAINT `Plan_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Professional` ADD CONSTRAINT `Professional_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudioHour` ADD CONSTRAINT `StudioHour_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeSlot` ADD CONSTRAINT `TimeSlot_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleSlot` ADD CONSTRAINT `ScheduleSlot_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhysicalAssessment` ADD CONSTRAINT `PhysicalAssessment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evolution` ADD CONSTRAINT `Evolution_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvolutionPhoto` ADD CONSTRAINT `EvolutionPhoto_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassSession` ADD CONSTRAINT `ClassSession_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassSession` ADD CONSTRAINT `ClassSession_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
