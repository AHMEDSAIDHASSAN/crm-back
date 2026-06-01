-- Dev / QA: delete every row in `leads` and all tables that reference leads (not DROP TABLE).
-- Order matters: call_logs / whatsapp_interactions reference lead_feedback as well as leads.
-- Run in MySQL client against your CRM database, e.g.:
--   mysql -u root -p crm < scripts/wipe_all_lead_data_mysql.sql
--
-- If `imported_count` columns do not exist yet, comment out the UPDATE data_batches block
-- and run prisma/migrations/20260412170000_data_batch_import_counts/migration.sql first.

DELETE FROM `call_logs`;
DELETE FROM `whatsapp_interactions`;
DELETE FROM `meetings`;
DELETE FROM `lead_assignments`;
DELETE FROM `lead_auto_retractions`;
DELETE FROM `lead_feedback`;
DELETE FROM `leads`;

UPDATE `data_batches`
SET
  `imported_count` = 0,
  `skipped_duplicate_count` = 0,
  `failed_import_count` = 0;

UPDATE `lead_uploads` SET `data_batch_id` = NULL;
