-- HR role (personnel dropdown + HR module). Idempotent for existing DBs.
INSERT INTO `roles` (`name`, `display_name`, `hierarchy_level`)
VALUES ('hr', 'HR', 6)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`), `hierarchy_level` = VALUES(`hierarchy_level`);
