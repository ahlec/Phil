UPDATE info SET value = '6' WHERE key = 'database-version';

ALTER TABLE hijack_prompts DROP COLUMN approved_by_user;
ALTER TABLE hijack_prompts ADD COLUMN submitted_anonymously BIT(1) NOT NULL DEFAULT E'0';
ALTER TABLE hijack_prompts RENAME TO prompts;

CREATE TABLE prompt_buckets (
	bucket_id SERIAL NOT NULL,
	server_id INTEGER NOT NULL,
	channel_id INTEGER NOT NULL,
	reference_handle VARCHAR(30) NOT NULL UNIQUE,
	display_name VARCHAR(100) NOT NULL
);
