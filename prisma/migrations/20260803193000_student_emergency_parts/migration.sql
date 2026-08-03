-- Contato de emergência estruturado
ALTER TABLE `Student` ADD COLUMN `emergencyName` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `Student` ADD COLUMN `emergencyRelation` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `Student` ADD COLUMN `emergencyPhone` VARCHAR(191) NOT NULL DEFAULT '';
