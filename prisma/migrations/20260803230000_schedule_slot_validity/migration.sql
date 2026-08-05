-- Add validity columns (no-op if already present in some environments)
-- ALTER TABLE `ScheduleSlot` ADD COLUMN `effectiveFrom` DATE NOT NULL DEFAULT ('2000-01-01');
-- ALTER TABLE `ScheduleSlot` ADD COLUMN `effectiveTo` DATE NULL;

-- Unique key per slot version
-- DROP INDEX IF EXISTS handled manually when old unique still exists

CREATE UNIQUE INDEX IF NOT EXISTS `ScheduleSlot_studentId_weekday_time_effectiveFrom_key` ON `ScheduleSlot`(`studentId`, `weekday`, `time`, `effectiveFrom`);
