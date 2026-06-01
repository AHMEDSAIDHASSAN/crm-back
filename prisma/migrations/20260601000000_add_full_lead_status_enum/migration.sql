-- Add all missing lead statuses: interested, contacted, converted, closed, lost
-- Safe: convert to VARCHAR first, then back to full ENUM

ALTER TABLE `leads`
  MODIFY COLUMN `status` VARCHAR(64) NOT NULL DEFAULT 'new_lead';

ALTER TABLE `leads`
  MODIFY COLUMN `status` ENUM(
    'new_lead',
    'cold_call',
    'follow_up',
    'qualified',
    'no_answer',
    'wrong_number',
    'not_interested',
    'switched_off',
    'meeting_cancelled',
    'purchased',
    'assigned',
    'rotation',
    'interested',
    'contacted',
    'converted',
    'closed',
    'lost'
  ) NOT NULL DEFAULT 'new_lead';
