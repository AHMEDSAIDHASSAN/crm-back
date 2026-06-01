ALTER TABLE `notifications`
  MODIFY COLUMN `notification_type` ENUM(
    'lead_assigned',
    'lead_retracted',
    'meeting_reminder',
    'meeting_scheduled',
    'unit_created',
    'unit_published',
    'preview_requested',
    'preview_approved',
    'preview_rejected',
    'preview_checked_in',
    'preview_checked_out',
    'preview_cancelled',
    'system_alert'
  ) NOT NULL;
