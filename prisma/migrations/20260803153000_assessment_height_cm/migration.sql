-- Altura de avaliações passa a ser armazenada em centímetros.
UPDATE `PhysicalAssessment`
SET `height` = ROUND(`height` * 100, 1)
WHERE `height` > 0 AND `height` < 3;
