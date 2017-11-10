UPDATE info SET value = '5' WHERE key = 'database-version';

CREATE TABLE timezones(
    username VARCHAR(100) NOT NULL,
    userid VARCHAR(40) NOT NULL,
    stage INTEGER NOT NULL,
    will_provide BIT(1),
    timezone_name VARCHAR(80),
    country_name VARCHAR(40)
);
