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
ALTER TABLE server_configs ADD COLUMN admin_channel_id VARCHAR;
ALTER TABLE server_configs ADD COLUMN introductions_channel_id VARCHAR;
ALTER TABLE server_configs ADD COLUMN news_channel_id VARCHAR;
ALTER TABLE server_configs ADD COLUMN admin_role_id VARCHAR;
ALTER TABLE server_configs ADD COLUMN welcome_message TEXT;
ALTER TABLE server_configs ADD COLUMN fandom_map_link TEXT;

ALTER TABLE prompt_buckets DROP COLUMN should_pin_posts;
