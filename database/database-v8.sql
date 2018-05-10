UPDATE info SET value = '8' WHERE key = 'database-version';

CREATE TABLE reactable_posts (
    message_id VARCHAR NOT NULL UNIQUE,
    server_id VARCHAR NOT NULL,
    channel_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    created TIMESTAMP NOT NULL,
    timelimit INT NOT NULL,
    reactable_type VARCHAR NOT NULL,
    jsonData TEXT
);

ALTER TABLE server_configs ADD COLUMN command_prefix VARCHAR NOT NULL DEFAULT E'p!';
