-- Restore meeting lifecycle statuses. `checkin`/`checkout` here were DB statuses — map GPS stays in current_location / checkout_location.

ALTER TABLE `meetings` MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'scheduled';

UPDATE `meetings` SET `status` = 'scheduled' WHERE `status` = 'checkin' AND `started_at` IS NULL;
UPDATE `meetings` SET `status` = 'in_progress' WHERE `status` = 'checkin' AND `started_at` IS NOT NULL;
UPDATE `meetings` SET `status` = 'completed' WHERE `status` = 'checkout';

ALTER TABLE `meetings` MODIFY COLUMN `status` ENUM(
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
) NOT NULL DEFAULT 'scheduled';
