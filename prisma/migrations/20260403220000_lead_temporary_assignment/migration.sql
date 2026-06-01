-- Time-limited lead assignment: expiry time, action (rotation | backup_sales), optional backup user
ALTER TABLE `leads`
  ADD COLUMN `assignment_expires_at` DATETIME(3) NULL,
  ADD COLUMN `assignment_expire_action` ENUM('rotation', 'backup_sales') NULL,
  ADD COLUMN `assignment_backup_user_id` BIGINT NULL;

CREATE INDEX `idx_leads_assignment_expires` ON `leads`(`assignment_expires_at`);

ALTER TABLE `leads`
  ADD CONSTRAINT `leads_assignment_backup_user_id_fkey`
  FOREIGN KEY (`assignment_backup_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
