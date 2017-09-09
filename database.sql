CREATE TABLE info (
	key VARCHAR(40) NOT NULL,
	value VARCHAR(40) NOT NULL,
	PRIMARY KEY ("key")
);

INSERT INTO info(key, value) VALUES('database-version', '1');

CREATE TABLE hijack_prompts (
	prompt_id SERIAL NOT NULL,
	suggesting_user VARCHAR(100) NOT NULL,
	suggesting_userId VARCHAR(40) NOT NULL,
	date_suggested TIMESTAMP NULL,
	has_been_posted BIT(1) NOT NULL DEFAULT E'0',
	prompt_text TEXT NOT NULL,
	approved_by_user BIT(1) NOT NULL DEFAULT E'0',
	approved_by_admin BIT(1) NOT NULL DEFAULT E'0',
	prompt_number INTEGER NULL DEFAULT NULL,
	prompt_date DATE NULL DEFAULT NULL
);

CREATE TABLE requestable_roles (
	request_string VARCHAR(100) NOT NULL,
	role_id VARCHAR(40) NOT NULL
);

CREATE TABLE prompt_confirmation_queue (
	channel_id VARCHAR(40) NOT NULL,
	prompt_id INTEGER NOT NULL,
	confirm_number INTEGER NOT NULL
);