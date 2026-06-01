-- Unit: Drive media link + publishing (marketing workflow)
ALTER TABLE `units`
  ADD COLUMN `drive_media_link` VARCHAR(1024) NULL,
  ADD COLUMN `is_published` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `published_link` VARCHAR(1024) NULL,
  ADD COLUMN `published_at` DATETIME(3) NULL,
  ADD COLUMN `published_by_id` BIGINT NULL;

ALTER TABLE `units`
  ADD CONSTRAINT `units_published_by_id_fkey`
  FOREIGN KEY (`published_by_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
