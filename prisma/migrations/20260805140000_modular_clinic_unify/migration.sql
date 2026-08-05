-- Plan kind + sessionsTotal
ALTER TABLE `Plan` ADD COLUMN `kind` ENUM('mensalidade', 'pacote', 'avulso') NOT NULL DEFAULT 'mensalidade';
ALTER TABLE `Plan` ADD COLUMN `sessionsTotal` INT NULL;

-- Student flags + optional plan/finance
ALTER TABLE `Student` ADD COLUMN `usesPilates` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Student` ADD COLUMN `usesClinic` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Student` MODIFY `planId` VARCHAR(191) NULL;
ALTER TABLE `Student` MODIFY `monthlyValue` DECIMAL(10, 2) NULL;

-- Service
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('pilates', 'fisioterapia', 'massoterapia', 'auriculoterapia', 'avaliacao', 'experimental', 'outro') NOT NULL,
    `durationMinutes` INT NOT NULL DEFAULT 60,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `professionalId` VARCHAR(191) NULL,
    `requiresInitialAssessment` BOOLEAN NOT NULL DEFAULT false,
    `requiresEvolution` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Service_studioId_idx`(`studioId`),
    INDEX `Service_studioId_active_idx`(`studioId`, `active`),
    INDEX `Service_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Service` ADD CONSTRAINT `Service_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Service` ADD CONSTRAINT `Service_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `Professional`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ClinicalAttendance
CREATE TABLE `ClinicalAttendance` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `professionalId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `weekday` ENUM('Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado') NOT NULL,
    `time` VARCHAR(5) NOT NULL,
    `durationMinutes` INT NOT NULL DEFAULT 60,
    `status` ENUM('agendada', 'realizada', 'falta', 'cancelada') NOT NULL DEFAULT 'agendada',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `ClinicalAttendance_studioId_date_idx`(`studioId`, `date`),
    INDEX `ClinicalAttendance_studentId_idx`(`studentId`),
    INDEX `ClinicalAttendance_serviceId_idx`(`serviceId`),
    INDEX `ClinicalAttendance_professionalId_date_time_idx`(`professionalId`, `date`, `time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClinicalAttendance` ADD CONSTRAINT `ClinicalAttendance_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ClinicalAttendance` ADD CONSTRAINT `ClinicalAttendance_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ClinicalAttendance` ADD CONSTRAINT `ClinicalAttendance_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ClinicalAttendance` ADD CONSTRAINT `ClinicalAttendance_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `Professional`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Inventory
CREATE TABLE `InventoryProduct` (
    `id` VARCHAR(191) NOT NULL,
    `studioId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT '',
    `lot` VARCHAR(191) NOT NULL DEFAULT '',
    `expiresAt` DATE NULL,
    `quantity` INT NOT NULL DEFAULT 0,
    `minQuantity` INT NOT NULL DEFAULT 0,
    `supplier` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `InventoryProduct_studioId_idx`(`studioId`),
    INDEX `InventoryProduct_studioId_name_idx`(`studioId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InventoryProduct` ADD CONSTRAINT `InventoryProduct_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default clinical services (studio-1)
INSERT INTO `Service` (`id`, `studioId`, `name`, `category`, `durationMinutes`, `price`, `requiresInitialAssessment`, `requiresEvolution`, `active`, `createdAt`, `updatedAt`)
VALUES
  ('svc-fisioterapia', 'studio-1', 'Fisioterapia', 'fisioterapia', 60, 0, true, true, true, NOW(3), NOW(3)),
  ('svc-massoterapia', 'studio-1', 'Massoterapia', 'massoterapia', 60, 0, false, false, true, NOW(3), NOW(3)),
  ('svc-auriculoterapia', 'studio-1', 'Auriculoterapia', 'auriculoterapia', 45, 0, false, true, true, NOW(3), NOW(3)),
  ('svc-avaliacao', 'studio-1', 'Avaliação', 'avaliacao', 60, 0, false, false, true, NOW(3), NOW(3)),
  ('svc-experimental', 'studio-1', 'Sessão experimental', 'experimental', 50, 0, false, false, true, NOW(3), NOW(3));

-- Migrate Patient → Student (clinic-only)
INSERT INTO `Student` (
  `id`, `studioId`, `name`, `birthDate`, `sex`, `cpf`, `phone`, `email`,
  `cep`, `street`, `addressNumber`, `neighborhood`, `city`, `state`, `address`,
  `emergencyName`, `emergencyRelation`, `emergencyPhone`, `emergencyContact`,
  `active`, `since`, `objective`, `pathologies`, `injuries`, `surgeries`, `restrictions`, `medications`, `notes`,
  `usesPilates`, `usesClinic`, `planId`, `monthlyValue`, `discountPercent`, `dueDay`, `paymentMethod`,
  `createdAt`, `updatedAt`
)
SELECT
  CONCAT('migrated-', p.`id`),
  p.`studioId`,
  p.`name`,
  p.`birthDate`,
  p.`sex`,
  p.`cpf`,
  p.`phone`,
  p.`email`,
  '', '', '', '', '', '', '',
  '', '', '', '',
  p.`active`,
  CURDATE(),
  '', '', '', '', '', '',
  COALESCE(p.`notes`, ''),
  false,
  true,
  NULL,
  NULL,
  0,
  10,
  'PIX',
  p.`createdAt`,
  p.`updatedAt`
FROM `Patient` p
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'Patient');

-- Migrate ClinicAppointment → ClinicalAttendance
INSERT INTO `ClinicalAttendance` (
  `id`, `studioId`, `studentId`, `serviceId`, `professionalId`,
  `date`, `weekday`, `time`, `durationMinutes`, `status`, `notes`, `createdAt`, `updatedAt`
)
SELECT
  a.`id`,
  a.`studioId`,
  CONCAT('migrated-', a.`patientId`),
  CASE a.`specialty`
    WHEN 'fisioterapia' THEN 'svc-fisioterapia'
    WHEN 'massoterapia' THEN 'svc-massoterapia'
    WHEN 'auriculoterapia' THEN 'svc-auriculoterapia'
    ELSE 'svc-avaliacao'
  END,
  a.`professionalId`,
  a.`date`,
  a.`weekday`,
  a.`time`,
  60,
  CASE a.`status`
    WHEN 'realizada' THEN 'realizada'
    WHEN 'falta' THEN 'falta'
    WHEN 'cancelada' THEN 'cancelada'
    ELSE 'agendada'
  END,
  a.`notes`,
  a.`createdAt`,
  a.`updatedAt`
FROM `ClinicAppointment` a
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ClinicAppointment');

-- Drop old clinic patient domain
DROP TABLE IF EXISTS `ClinicAppointment`;
DROP TABLE IF EXISTS `Patient`;
