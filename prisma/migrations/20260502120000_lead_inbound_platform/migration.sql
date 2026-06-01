-- AlterTable
ALTER TABLE `leads` ADD COLUMN `inbound_platform` VARCHAR(32) NULL;

-- CreateIndex
CREATE INDEX `idx_leads_inbound_platform` ON `leads`(`inbound_platform`);
