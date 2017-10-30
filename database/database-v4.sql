UPDATE info SET value = '4' WHERE key = 'database-version';

CREATE TABLE timezones (
	username VARCHAR(100) NOT NULL,
	userid VARCHAR(40) NOT NULL,
	timezone_name VARCHAR(100) NOT NULL
);