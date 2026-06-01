-- Marketing + HR roles (required by app — see prisma/seed.ts, src/constants/roles.ts).
-- Idempotent: safe if rows already exist (e.g. hr from 20260412160000_add_hr_role).
INSERT INTO `roles` (`name`, `display_name`, `hierarchy_level`)
VALUES ('marketing', 'Marketing', 5)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`), `hierarchy_level` = VALUES(`hierarchy_level`);

INSERT INTO `roles` (`name`, `display_name`, `hierarchy_level`)
VALUES ('hr', 'HR', 6)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`), `hierarchy_level` = VALUES(`hierarchy_level`);
