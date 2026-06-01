-- Add no_answer_first_call to LeadStatus enum
ALTER TABLE `leads`
  MODIFY COLUMN `status` VARCHAR(64) NOT NULL DEFAULT 'new_lead';

ALTER TABLE `leads`
  MODIFY COLUMN `status` ENUM(
    'new_lead','cold_call','follow_up','qualified',
    'no_answer','no_answer_first_call','wrong_number','not_interested',
    'switched_off','meeting_cancelled','purchased','assigned','rotation',
    'interested','contacted','converted','closed','lost'
  ) NOT NULL DEFAULT 'new_lead';

-- Also update lead_feedback feedbackType if it's an ENUM
ALTER TABLE `lead_feedback`
  MODIFY COLUMN `feedback_type` VARCHAR(64) NOT NULL;

ALTER TABLE `lead_feedback`
  MODIFY COLUMN `feedback_type` ENUM(
    'new_lead','cold_call','follow_up','qualified',
    'no_answer','no_answer_first_call','wrong_number','not_interested',
    'switched_off','meeting_cancelled','purchased','assigned','rotation',
    'interested','contacted','converted','closed','lost'
  ) NOT NULL;
