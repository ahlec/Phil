UPDATE info SET value = '2' WHERE key = 'database-version';

ALTER TABLE hijack_prompts ADD has_reminded_channel BIT(1) NOT NULL DEFAULT E'0';
