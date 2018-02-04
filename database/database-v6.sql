UPDATE info SET value = '6' WHERE key = 'database-version';

ALTER TABLE hijack_prompts DROP COLUMN approved_by_user;
ALTER TABLE hijack_prompts ADD COLUMN submitted_anonymously BIT(1) NOT NULL DEFAULT E'0';
ALTER TABLE hijack_prompts RENAME TO prompts;

CREATE TABLE prompt_buckets (
	bucket_id SERIAL NOT NULL UNIQUE,
	server_id VARCHAR NOT NULL,
	channel_id VARCHAR NOT NULL,
	reference_handle VARCHAR(30) NOT NULL UNIQUE,
	display_name VARCHAR(100) NOT NULL
);

INSERT INTO prompt_buckets(server_id, channel_id, reference_handle, display_name) VALUES('240114141031825408', '254309217442332673', 'hijack-daily', 'Hijack Daily Prompts (SFW)');

ALTER TABLE prompts ADD COLUMN bucket_id INTEGER NOT NULL DEFAULT E'1' REFERENCES prompt_buckets(bucket_id);
