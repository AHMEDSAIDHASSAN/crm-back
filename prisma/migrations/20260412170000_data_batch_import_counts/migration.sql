-- Import stats on data_batches (last run: imported / skipped duplicates / failed rows)
ALTER TABLE `data_batches`
  ADD COLUMN `imported_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `skipped_duplicate_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `failed_import_count` INT NOT NULL DEFAULT 0;
