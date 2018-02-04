UPDATE info SET value = '6' WHERE key = 'database-version';

ALTER TABLE hijack_prompts DROP COLUMN approved_by_user;
ALTER TABLE hijack_prompts ADD COLUMN submitted_anonymously BIT(1) NOT NULL DEFAULT E'0';
