-- Unit preview / showing (sales schedules → check-in/out with GPS)
CREATE TABLE `unit_previews` (
  `id`               BIGINT       NOT NULL AUTO_INCREMENT,
  `unit_id`          BIGINT       NOT NULL,
  `requested_by_id`  BIGINT       NOT NULL,
  `client_name`      VARCHAR(255) NOT NULL,
  `client_phone`     VARCHAR(30)  NULL,
  `scheduled_at`     DATETIME(3)  NOT NULL,
  `duration_min`     INT          NULL DEFAULT 60,
  `notes`            TEXT         NULL,
  `status`           ENUM('pending','scheduled','checked_in','checked_out','cancelled') NOT NULL DEFAULT 'pending',
  `check_in_at`      DATETIME(3)  NULL,
  `check_in_lat`     DECIMAL(10,7) NULL,
  `check_in_lng`     DECIMAL(10,7) NULL,
  `check_out_at`     DATETIME(3)  NULL,
  `check_out_lat`    DECIMAL(10,7) NULL,
  `check_out_lng`    DECIMAL(10,7) NULL,
  `created_at`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_preview_unit`      (`unit_id`),
  INDEX `idx_preview_requester` (`requested_by_id`),
  INDEX `idx_preview_status`    (`status`),
  INDEX `idx_preview_scheduled` (`scheduled_at`),

  CONSTRAINT `unit_previews_unit_id_fkey`
    FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `unit_previews_requested_by_id_fkey`
    FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
