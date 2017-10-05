UPDATE info SET value = '3' WHERE key = 'database-version';

CREATE TABLE birthdays (
    username VARCHAR(100) NOT NULL,
    userid VARCHAR(40) NOT NULL,
    birthday_day INTEGER NOT NULL,
    birthday_month INTEGER NOT NULL
);