-- Convênio: Sim/Não + carteirinha e produto quando Sim
ALTER TABLE `Student` MODIFY `convenio` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Student` ADD COLUMN `convenioCarteirinha` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `Student` ADD COLUMN `convenioProduto` VARCHAR(191) NOT NULL DEFAULT '';
