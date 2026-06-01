-- Unit: listing address, floor, external reference links; extend full-text search
ALTER TABLE `units`
  ADD COLUMN `address` VARCHAR(512) NULL,
  ADD COLUMN `floor` INT NULL,
  ADD COLUMN `external_links` JSON NULL;

ALTER TABLE `units` DROP INDEX `idx_unit_search`;
ALTER TABLE `units` ADD FULLTEXT INDEX `idx_unit_search` (`description`, `project_name`, `location`, `address`);
