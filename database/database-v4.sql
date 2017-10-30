UPDATE info SET value = '4' WHERE key = 'database-version';

CREATE TABLE timezones(
	username VARCHAR(100) NOT NULL,
	userid VARCHAR(40) NOT NULL,
	timezone_name VARCHAR(100) NOT NULL
);

CREATE TABLE timezone_questionnaire(
	username VARCHAR(100) NOT NULL,
	userid VARCHAR(40) NOT NULL,
	stage INTEGER NOT NULL,
	will_provide BIT(1),
	utc_offset INTEGER
);