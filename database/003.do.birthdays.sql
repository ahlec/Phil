UPDATE info SET value = '3' WHERE key = 'database-version';

INSERT INTO info(key, value) VALUES('happy-birthday-last-wished', '1969-12-31');

CREATE TABLE birthdays (
    username VARCHAR(100) NOT NULL,
    userid VARCHAR(40) NOT NULL,
    birthday_day INTEGER NOT NULL,
    birthday_month INTEGER NOT NULL
);
