-- Add salary field to users table (monthly salary for HR/Finance)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `salary` DECIMAL(12, 2) NULL;
