-- Ensure leads.status includes the latest statuses used by frontend filters.
-- Use VARCHAR bridge to safely normalize any legacy values before applying ENUM.

ALTER TABLE `leads`
  MODIFY COLUMN `status` VARCHAR(64) NOT NULL DEFAULT 'new_lead';

UPDATE `leads`
SET `status` = 'new_lead'
WHERE `status` = 'new';

UPDATE `leads`
SET `status` = 'cold_call'
WHERE `status` = 'contacted';

UPDATE `leads`
SET `status` = 'follow_up'
WHERE `status` = 'another_meeting';

UPDATE `leads`
SET `status` = 'purchased'
WHERE `status` = 'converted';

UPDATE `leads`
SET `status` = 'meeting_cancelled'
WHERE `status` IN ('lost', 'meeting_canceled');

UPDATE `leads`
SET `status` = 'switched_off'
WHERE `status` IN ('switch_off', 'switchedoff');

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
    'rotation'
  ) NOT NULL DEFAULT 'new_lead';
