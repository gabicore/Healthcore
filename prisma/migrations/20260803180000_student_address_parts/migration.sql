-- Campos de endereço estruturado do aluno (busca por CEP).
ALTER TABLE `Student`
  ADD COLUMN `street` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `addressNumber` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `neighborhood` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `city` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `state` VARCHAR(191) NOT NULL DEFAULT '';
