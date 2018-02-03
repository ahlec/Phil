UPDATE info SET value = '6' WHERE key = 'database-version';

ALTER TABLE hijack_prompts DROP COLUMN approved_by_user;
