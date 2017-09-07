CREATE TABLE info (
	key VARCHAR(40) NOT NULL,
	value VARCHAR(40) NOT NULL,
	PRIMARY KEY ("key")
);

INSERT INTO info(key, value) VALUES('database-version', '1');

CREATE TABLE hijack_prompts (
	prompt_id SERIAL NOT NULL,
	suggesting_user VARCHAR(100) NOT NULL,
	suggesting_userId INTEGER NOT NULL,
	date_suggested TIMESTAMP NULL,
	has_been_posted BIT(1) NOT NULL DEFAULT E'',
	prompt_text TEXT NOT NULL,
	approved_by_user INTEGER NOT NULL,
	approved_by_admin INTEGER NOT NULL
);

CREATE TABLE requestable_roles (
	request_string VARCHAR(100) NOT NULL,
	role_id VARCHAR(40) NOT NULL
);