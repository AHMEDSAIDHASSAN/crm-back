-- Full CRM schema generated from prisma/schema.prisma (empty database).
-- Apply: mysql -u root -p crm < prisma/baseline_from_schema.sql
-- Or from backend: npx prisma db push  (uses DATABASE_URL from .env)
-- Regenerate: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script -o prisma/baseline_from_schema.sql

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `hierarchy_level` INTEGER NOT NULL,
    `permissions` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_name_key`(`name`),
    INDEX `idx_hierarchy`(`hierarchy_level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role_id` INTEGER NOT NULL,
    `team_id` BIGINT NULL,
    `title` ENUM('advisor', 'consultant') NULL,
    `salary` DECIMAL(12, 2) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_email`(`email`),
    INDEX `idx_role`(`role_id`),
    INDEX `idx_team`(`team_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_title`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `session_token` VARCHAR(255) NOT NULL,
    `device_type` ENUM('web', 'mobile_ios', 'mobile_android') NOT NULL,
    `device_info` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_session_token_key`(`session_token`),
    INDEX `idx_token`(`session_token`),
    INDEX `idx_user`(`user_id`),
    INDEX `idx_expires`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `check_in_time` DATETIME(3) NOT NULL,
    `check_in_location` TEXT NULL,
    `check_out_time` DATETIME(3) NULL,
    `check_out_location` TEXT NULL,
    `is_late` BOOLEAN NOT NULL DEFAULT false,
    `late_minutes` INTEGER NULL,
    `work_duration` INTEGER NULL,
    `penalty_amount` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_user`(`user_id`),
    INDEX `idx_check_in`(`check_in_time`),
    INDEX `idx_late`(`is_late`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hr_policies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `shift_start_time` VARCHAR(10) NOT NULL,
    `shift_end_time` VARCHAR(10) NOT NULL,
    `grace_minutes` INTEGER NOT NULL DEFAULT 0,
    `penalty_per_hour` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `team_leader_id` BIGINT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_leader`(`team_leader_id`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_members` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `team_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `left_at` DATETIME(3) NULL,

    INDEX `idx_team`(`team_id`),
    INDEX `idx_user`(`user_id`),
    UNIQUE INDEX `unique_active_membership`(`team_id`, `user_id`, `left_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_sources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('fresh', 'cold_call', 'referral', 'walk_in', 'other') NOT NULL,
    `platform` VARCHAR(50) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_type`(`type`),
    INDEX `idx_platform`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `platform` ENUM('facebook', 'instagram', 'meta', 'dubizzle', 'property_finder', 'other') NOT NULL,
    `platform_label` VARCHAR(100) NULL,
    `platform_icon` VARCHAR(255) NULL,
    `campaign_id_external` VARCHAR(255) NULL,
    `status` ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `budget` DECIMAL(10, 2) NULL,
    `lead_source_id` INTEGER NULL,
    `time_limit` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_platform`(`platform`),
    INDEX `idx_status`(`status`),
    INDEX `idx_external_id`(`campaign_id_external`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `lead_source_id` INTEGER NULL,
    `campaign_id` BIGINT NULL,
    `data_batch_id` BIGINT NULL,
    `status` ENUM('new', 'assigned', 'contacted', 'qualified', 'interested', 'not_interested', 'no_answer', 'converted', 'lost', 'rotation', 'another_meeting') NOT NULL DEFAULT 'new',
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `is_starred` BOOLEAN NOT NULL DEFAULT false,
    `assigned_to` BIGINT NULL,
    `assigned_at` DATETIME(3) NULL,
    `assignment_mode` ENUM('standard', 'customize') NOT NULL DEFAULT 'standard',
    `assignment_expires_at` DATETIME(3) NULL,
    `assignment_expire_action` ENUM('rotation', 'backup_sales') NULL,
    `assignment_backup_user_id` BIGINT NULL,
    `team_id` BIGINT NULL,
    `property_preferences` JSON NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `lead_front` BOOLEAN NOT NULL DEFAULT true,
    `type` ENUM('primary', 'cold_call', 'campaign') NOT NULL DEFAULT 'primary',

    INDEX `idx_phone`(`phone`),
    INDEX `idx_email`(`email`),
    INDEX `idx_status`(`status`),
    INDEX `idx_assigned`(`assigned_to`),
    INDEX `idx_team`(`team_id`),
    INDEX `idx_data_batch`(`data_batch_id`),
    INDEX `idx_type`(`type`),
    INDEX `idx_starred`(`is_starred`),
    INDEX `idx_created`(`created_at`),
    INDEX `idx_leads_assigned_status`(`assigned_to`, `status`),
    INDEX `idx_leads_assignment_expires`(`assignment_expires_at`),
    INDEX `idx_leads_team_status`(`team_id`, `status`),
    INDEX `idx_leads_created_status`(`created_at`, `status`),
    FULLTEXT INDEX `idx_leads_search`(`first_name`, `last_name`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_batches` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `batch_name` VARCHAR(255) NOT NULL,
    `data_source` VARCHAR(255) NOT NULL,
    `purchase_date` DATE NULL,
    `purchase_price` DECIMAL(10, 2) NULL,
    `total_records` INTEGER NOT NULL,
    `quality` ENUM('high', 'medium', 'low') NULL,
    `notes` TEXT NULL,
    `created_by` BIGINT NOT NULL,
    `campaign_id` BIGINT NULL,
    `imported_count` INTEGER NOT NULL DEFAULT 0,
    `skipped_duplicate_count` INTEGER NOT NULL DEFAULT 0,
    `failed_import_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_data_source`(`data_source`),
    INDEX `idx_data_batch_campaign`(`campaign_id`),
    INDEX `idx_purchase_date`(`purchase_date`),
    INDEX `idx_creator`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_uploads` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uploaded_by` BIGINT NOT NULL,
    `data_batch_id` BIGINT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NULL,
    `total_rows` INTEGER NOT NULL,
    `successful_imports` INTEGER NOT NULL DEFAULT 0,
    `failed_imports` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
    `error_log` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `idx_uploader`(`uploaded_by`),
    INDEX `idx_data_batch`(`data_batch_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_assignments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NOT NULL,
    `assigned_to` BIGINT NOT NULL,
    `assigned_by` BIGINT NULL,
    `assignment_type` ENUM('initial', 'manual', 'rotation', 'auto_retract') NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `retracted_at` DATETIME(3) NULL,
    `reason` TEXT NULL,

    INDEX `idx_lead`(`lead_id`),
    INDEX `idx_assigned_to`(`assigned_to`),
    INDEX `idx_assigned_at`(`assigned_at`),
    INDEX `idx_assignments_lead_assigned`(`lead_id`, `assigned_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_feedback` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `feedback_type` ENUM('call', 'whatsapp', 'email', 'meeting', 'other') NOT NULL,
    `outcome` ENUM('answered', 'no_answer', 'interested', 'not_interested', 'scheduled_meeting', 'other') NOT NULL,
    `description` TEXT NOT NULL,
    `next_action` VARCHAR(255) NULL,
    `next_action_date` DATETIME(3) NULL,
    `call_duration` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_lead`(`lead_id`),
    INDEX `idx_user`(`user_id`),
    INDEX `idx_outcome`(`outcome`),
    INDEX `idx_created`(`created_at`),
    INDEX `idx_feedback_lead_created`(`lead_id`, `created_at`),
    FULLTEXT INDEX `idx_feedback_search`(`description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_rotation_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rule_name` VARCHAR(100) NOT NULL,
    `team_id` BIGINT NULL,
    `time_limit_hours` INTEGER NOT NULL,
    `max_no_answer_attempts` INTEGER NOT NULL DEFAULT 3,
    `no_answer_days_threshold` INTEGER NOT NULL DEFAULT 7,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_team`(`team_id`),
    INDEX `idx_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_auto_retractions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NOT NULL,
    `previous_owner` BIGINT NOT NULL,
    `retracted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(255) NOT NULL,
    `time_without_feedback_hours` INTEGER NULL,
    `reassigned_to` BIGINT NULL,

    INDEX `idx_lead`(`lead_id`),
    INDEX `idx_previous_owner`(`previous_owner`),
    INDEX `idx_retracted`(`retracted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `call_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `call_type` ENUM('outbound', 'inbound') NOT NULL DEFAULT 'outbound',
    `call_status` ENUM('completed', 'no_answer', 'busy', 'failed') NOT NULL,
    `duration` INTEGER NULL,
    `recording_url` VARCHAR(500) NULL,
    `initiated_from` ENUM('web', 'mobile') NOT NULL,
    `feedback_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_lead`(`lead_id`),
    INDEX `idx_user`(`user_id`),
    INDEX `idx_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_interactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `message_count` INTEGER NOT NULL DEFAULT 1,
    `last_message_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `initiated_from` ENUM('web', 'mobile') NOT NULL,
    `feedback_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_lead`(`lead_id`),
    INDEX `idx_user`(`user_id`),
    INDEX `idx_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meetings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NOT NULL,
    `scheduled_by` BIGINT NOT NULL,
    `meeting_date` DATETIME(3) NOT NULL,
    `location` VARCHAR(255) NULL,
    `meeting_type` ENUM('site_visit', 'office', 'virtual', 'other') NOT NULL,
    `is_private` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
    `current_location` TEXT NULL,
    `checkout_location` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `feedback` TEXT NULL,
    `notes` TEXT NULL,
    `outcome` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_lead`(`lead_id`),
    INDEX `idx_scheduled_by`(`scheduled_by`),
    INDEX `idx_meeting_date`(`meeting_date`),
    INDEX `idx_status`(`status`),
    INDEX `idx_private`(`is_private`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `address` VARCHAR(512) NULL,
    `project_name` VARCHAR(255) NULL,
    `location` VARCHAR(255) NULL,
    `floor` INTEGER NULL,
    `price` DECIMAL(15, 2) NULL,
    `monthly_installment` DECIMAL(15, 2) NULL,
    `delivery_date` DATE NULL,
    `bedrooms` INTEGER NULL,
    `bathrooms` INTEGER NULL,
    `area` DECIMAL(10, 2) NULL,
    `unit_type` VARCHAR(100) NULL,
    `amenities` JSON NULL,
    `external_links` JSON NULL,
    `images` JSON NULL,
    `drive_media_link` VARCHAR(1024) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `published_link` VARCHAR(1024) NULL,
    `published_at` DATETIME(3) NULL,
    `published_by_id` BIGINT NULL,
    `status` ENUM('available', 'reserved', 'sold', 'unavailable') NOT NULL DEFAULT 'available',
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_code_key`(`code`),
    INDEX `idx_code`(`code`),
    INDEX `idx_status`(`status`),
    INDEX `idx_project`(`project_name`),
    INDEX `idx_creator`(`created_by`),
    FULLTEXT INDEX `idx_unit_search`(`description`, `project_name`, `location`, `address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_previews` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `unit_id` BIGINT NOT NULL,
    `requested_by_id` BIGINT NOT NULL,
    `client_name` VARCHAR(255) NOT NULL,
    `client_phone` VARCHAR(30) NULL,
    `scheduled_at` DATETIME(3) NOT NULL,
    `duration_min` INTEGER NULL DEFAULT 60,
    `notes` TEXT NULL,
    `status` ENUM('pending', 'scheduled', 'checked_in', 'checked_out', 'cancelled') NOT NULL DEFAULT 'pending',
    `check_in_at` DATETIME(3) NULL,
    `check_in_lat` DECIMAL(10, 7) NULL,
    `check_in_lng` DECIMAL(10, 7) NULL,
    `check_out_at` DATETIME(3) NULL,
    `check_out_lat` DECIMAL(10, 7) NULL,
    `check_out_lng` DECIMAL(10, 7) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_preview_unit`(`unit_id`),
    INDEX `idx_preview_requester`(`requested_by_id`),
    INDEX `idx_preview_status`(`status`),
    INDEX `idx_preview_scheduled`(`scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resale_units` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `owner_name` VARCHAR(255) NULL,
    `owner_phone` VARCHAR(20) NULL,
    `location` VARCHAR(255) NULL,
    `asking_price` DECIMAL(15, 2) NULL,
    `bedrooms` INTEGER NULL,
    `bathrooms` INTEGER NULL,
    `area` DECIMAL(10, 2) NULL,
    `unit_type` VARCHAR(100) NULL,
    `amenities` JSON NULL,
    `images` JSON NULL,
    `status` ENUM('available', 'reserved', 'sold', 'unavailable') NOT NULL DEFAULT 'available',
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `resale_units_code_key`(`code`),
    INDEX `idx_code`(`code`),
    INDEX `idx_status`(`status`),
    INDEX `idx_creator`(`created_by`),
    FULLTEXT INDEX `idx_resale_search`(`description`, `location`, `owner_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` TEXT NULL,
    `data_type` ENUM('string', 'integer', 'boolean', 'json') NOT NULL DEFAULT 'string',
    `description` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_setting_key_key`(`setting_key`),
    INDEX `idx_key`(`setting_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `notification_type` ENUM('lead_assigned', 'lead_retracted', 'meeting_reminder', 'meeting_scheduled', 'unit_created', 'unit_published', 'preview_requested', 'preview_approved', 'preview_rejected', 'preview_checked_in', 'preview_checked_out', 'preview_cancelled', 'system_alert') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `related_entity_type` VARCHAR(50) NULL,
    `related_entity_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user`(`user_id`),
    INDEX `idx_read`(`is_read`),
    INDEX `idx_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` BIGINT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user`(`user_id`),
    INDEX `idx_entity`(`entity_type`, `entity_id`),
    INDEX `idx_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_salary_deductions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` BIGINT NULL,

    INDEX `idx_deduction_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_commissions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `amount` DECIMAL(12, 2) NULL,
    `sale_date` DATE NOT NULL,
    `due_note` TEXT NULL,
    `status` ENUM('pending_collection', 'collected') NOT NULL DEFAULT 'pending_collection',
    `collected_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` BIGINT NULL,

    INDEX `idx_commission_user`(`user_id`),
    INDEX `idx_commission_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_logs` ADD CONSTRAINT `attendance_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_team_leader_id_fkey` FOREIGN KEY (`team_leader_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `lead_sources`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `lead_sources`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_data_batch_id_fkey` FOREIGN KEY (`data_batch_id`) REFERENCES `data_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_assignment_backup_user_id_fkey` FOREIGN KEY (`assignment_backup_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_batches` ADD CONSTRAINT `data_batches_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_batches` ADD CONSTRAINT `data_batches_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_uploads` ADD CONSTRAINT `lead_uploads_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_uploads` ADD CONSTRAINT `lead_uploads_data_batch_id_fkey` FOREIGN KEY (`data_batch_id`) REFERENCES `data_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_assignments` ADD CONSTRAINT `lead_assignments_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_assignments` ADD CONSTRAINT `lead_assignments_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_assignments` ADD CONSTRAINT `lead_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_feedback` ADD CONSTRAINT `lead_feedback_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_feedback` ADD CONSTRAINT `lead_feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_rotation_rules` ADD CONSTRAINT `lead_rotation_rules_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_auto_retractions` ADD CONSTRAINT `lead_auto_retractions_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_auto_retractions` ADD CONSTRAINT `lead_auto_retractions_previous_owner_fkey` FOREIGN KEY (`previous_owner`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_auto_retractions` ADD CONSTRAINT `lead_auto_retractions_reassigned_to_fkey` FOREIGN KEY (`reassigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `lead_feedback`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_interactions` ADD CONSTRAINT `whatsapp_interactions_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_interactions` ADD CONSTRAINT `whatsapp_interactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_interactions` ADD CONSTRAINT `whatsapp_interactions_feedback_id_fkey` FOREIGN KEY (`feedback_id`) REFERENCES `lead_feedback`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_scheduled_by_fkey` FOREIGN KEY (`scheduled_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_published_by_id_fkey` FOREIGN KEY (`published_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_previews` ADD CONSTRAINT `unit_previews_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_previews` ADD CONSTRAINT `unit_previews_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resale_units` ADD CONSTRAINT `resale_units_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_salary_deductions` ADD CONSTRAINT `sales_salary_deductions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_salary_deductions` ADD CONSTRAINT `sales_salary_deductions_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_commissions` ADD CONSTRAINT `sales_commissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_commissions` ADD CONSTRAINT `sales_commissions_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
