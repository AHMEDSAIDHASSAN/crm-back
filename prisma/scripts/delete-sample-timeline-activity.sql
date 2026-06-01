-- Removes the two timeline rows described:
--   Feedback: whatsapp · other · Ahmed Hassan (2026-04-12 ~2:28 PM local display)
--   Assignment: To Ahmed Hassan · manual · By mohamed elsayed ahmed (~2:20 PM)
-- Adjust DATE() / filters if your DB stores UTC and the row falls on another calendar date.

-- 1) Unlink optional FKs to lead_feedback (MySQL may block DELETE otherwise)
UPDATE call_logs cl
INNER JOIN lead_feedback lf ON cl.feedback_id = lf.id
INNER JOIN users u ON u.id = lf.user_id
SET cl.feedback_id = NULL
WHERE lf.feedback_type = 'whatsapp'
  AND lf.outcome = 'other'
  AND DATE(lf.created_at) = '2026-04-12'
  AND LOWER(CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name))) LIKE '%ahmed%hassan%';

UPDATE whatsapp_interactions wi
INNER JOIN lead_feedback lf ON wi.feedback_id = lf.id
INNER JOIN users u ON u.id = lf.user_id
SET wi.feedback_id = NULL
WHERE lf.feedback_type = 'whatsapp'
  AND lf.outcome = 'other'
  AND DATE(lf.created_at) = '2026-04-12'
  AND LOWER(CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name))) LIKE '%ahmed%hassan%';

-- 2) Delete that feedback row(s)
DELETE lf FROM lead_feedback lf
INNER JOIN users u ON u.id = lf.user_id
WHERE lf.feedback_type = 'whatsapp'
  AND lf.outcome = 'other'
  AND DATE(lf.created_at) = '2026-04-12'
  AND LOWER(CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name))) LIKE '%ahmed%hassan%';

-- 3) Delete that manual assignment row(s)
DELETE la FROM lead_assignments la
INNER JOIN users assignee ON assignee.id = la.assigned_to
INNER JOIN users assigner ON assigner.id = la.assigned_by
WHERE la.assignment_type = 'manual'
  AND DATE(la.assigned_at) = '2026-04-12'
  AND LOWER(CONCAT(TRIM(assignee.first_name), ' ', TRIM(assignee.last_name))) LIKE '%ahmed%hassan%'
  AND LOWER(CONCAT(TRIM(assigner.first_name), ' ', TRIM(assigner.last_name))) LIKE '%mohamed%'
  AND LOWER(CONCAT(TRIM(assigner.first_name), ' ', TRIM(assigner.last_name))) LIKE '%elsayed%';
