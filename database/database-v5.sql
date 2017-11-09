UPDATE info SET value = '5' WHERE key = 'database-version';

CREATE TABLE timezone_questionnaire(
    username VARCHAR(100) NOT NULL,
    userid VARCHAR(40) NOT NULL,
    stage INTEGER NOT NULL,
    will_provide BIT(1),
    utc_offset VARCHAR(10),
    is_united_states BIT(1)
);
