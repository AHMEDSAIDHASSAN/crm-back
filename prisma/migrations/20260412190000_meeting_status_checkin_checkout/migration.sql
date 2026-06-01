-- Replace meeting status with checkin | checkout only (MySQL: VARCHAR bridge so UPDATE works).

ALTER TABLE `meetings` MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'scheduled';

UPDATE `meetings` SET `status` = 'checkin' WHERE `status` IN ('scheduled', 'in_progress');
UPDATE `meetings` SET `status` = 'checkout' WHERE `status` IN ('completed', 'cancelled', 'no_show');

ALTER TABLE `meetings` MODIFY COLUMN `status` ENUM('checkin', 'checkout') NOT NULL DEFAULT 'checkin';
