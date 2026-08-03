-- Colunas de vigência experimentais, fora do schema Prisma atual.
-- Datas 0000-00-00 nessas colunas causavam P2020 em includes de ScheduleSlot.
ALTER TABLE `ScheduleSlot` DROP COLUMN `validFrom`;
ALTER TABLE `ScheduleSlot` DROP COLUMN `validTo`;
