-- AlterTable ScheduleSlot: vigência da grade
ALTER TABLE `ScheduleSlot` ADD COLUMN `validFrom` DATE NOT NULL DEFAULT '1970-01-01';
ALTER TABLE `ScheduleSlot` ADD COLUMN `validTo` DATE NULL;

-- Backfill: início do contrato ativo, senão data de entrada do aluno
UPDATE `ScheduleSlot` ss
INNER JOIN `Student` s ON s.`id` = ss.`studentId`
LEFT JOIN (
  SELECT `studentId`, MIN(`startDate`) AS `startDate`
  FROM `Contract`
  WHERE `status` = 'ativo'
  GROUP BY `studentId`
) c ON c.`studentId` = ss.`studentId`
SET ss.`validFrom` = COALESCE(c.`startDate`, s.`since`);

ALTER TABLE `ScheduleSlot` MODIFY `validFrom` DATE NOT NULL;

DROP INDEX `ScheduleSlot_studentId_weekday_time_key` ON `ScheduleSlot`;

CREATE INDEX `ScheduleSlot_studentId_validFrom_validTo_idx` ON `ScheduleSlot`(`studentId`, `validFrom`, `validTo`);

-- AlterTable ClassSession: vínculo falta ↔ reposição
ALTER TABLE `ClassSession` ADD COLUMN `coversSessionId` VARCHAR(191) NULL;

CREATE INDEX `ClassSession_coversSessionId_idx` ON `ClassSession`(`coversSessionId`);

ALTER TABLE `ClassSession` ADD CONSTRAINT `ClassSession_coversSessionId_fkey` FOREIGN KEY (`coversSessionId`) REFERENCES `ClassSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
