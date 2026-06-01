-- Extend Lead.type enum with platform
ALTER TABLE `leads`
  MODIFY COLUMN `type` ENUM('primary', 'cold_call', 'campaign', 'platform')
  NOT NULL DEFAULT 'primary';
