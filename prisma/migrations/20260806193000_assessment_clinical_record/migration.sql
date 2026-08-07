-- Colunas já existentes no ambiente: assessmentType, professional, specialty, service, chiefComplaint
ALTER TABLE `PhysicalAssessment` ADD COLUMN `painScale` INT NULL;
ALTER TABLE `PhysicalAssessment` ADD COLUMN `affectedRegion` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `functionalLimitations` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `clinicalFindings` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `testsPerformed` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `testResults` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `treatmentObjectives` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `weeklyFrequency` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `estimatedSessions` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `plannedTechniques` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `guidelines` TEXT NOT NULL DEFAULT '';
ALTER TABLE `PhysicalAssessment` ADD COLUMN `referrals` TEXT NOT NULL DEFAULT '';
