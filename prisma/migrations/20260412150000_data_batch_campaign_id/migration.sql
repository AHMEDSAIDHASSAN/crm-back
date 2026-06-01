ALTER TABLE `data_batches`
  ADD COLUMN `campaign_id` BIGINT NULL,
  ADD INDEX `idx_data_batch_campaign` (`campaign_id`),
  ADD CONSTRAINT `data_batches_campaign_id_fkey`
    FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
