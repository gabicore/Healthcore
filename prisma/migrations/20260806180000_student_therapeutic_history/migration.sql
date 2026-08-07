-- Expandir histórico terapêutico
ALTER TABLE `Student` ADD COLUMN `treatmentResults` TEXT NOT NULL DEFAULT '';
ALTER TABLE `Student` ADD COLUMN `treatmentInterruptions` TEXT NOT NULL DEFAULT '';
ALTER TABLE `Student` ADD COLUMN `treatmentResponse` TEXT NOT NULL DEFAULT '';
