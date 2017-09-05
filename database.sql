CREATE TABLE hijack_prompts (
	prompt_id SERIAL NOT NULL,
	suggesting_user VARCHAR(100) NOT NULL,
	suggesting_userId INTEGER NOT NULL,
	date_suggested TIMESTAMP NULL,
	has_been_posted BIT(1) NOT NULL DEFAULT E'',
	prompt_text TEXT NOT NULL
);

CREATE TABLE requestable_roles (
	request_string VARCHAR(100) NOT NULL,
	role_id VARCHAR(40) NOT NULL
);