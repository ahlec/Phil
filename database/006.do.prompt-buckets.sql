UPDATE info SET value = '6' WHERE key = 'database-version';

ALTER TABLE hijack_prompts DROP COLUMN approved_by_user;
ALTER TABLE hijack_prompts ADD COLUMN submitted_anonymously BIT(1) NOT NULL DEFAULT E'0';
ALTER TABLE hijack_prompts RENAME TO prompts;

CREATE TABLE server_configs (
    server_id VARCHAR NOT NULL UNIQUE,
    bot_control_channel_id VARCHAR NOT NULL
);

INSERT INTO server_configs(server_id, bot_control_channel_id) VALUES('240114141031825408', '240767750568542209');

CREATE TABLE prompt_buckets (
    bucket_id SERIAL NOT NULL UNIQUE,
    server_id VARCHAR NOT NULL,
    channel_id VARCHAR NOT NULL,
    reference_handle VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    is_paused BIT(1) NOT NULL DEFAULT E'0',
    should_pin_posts BIT(1) NOT NULL DEFAULT E'0',
    required_role_id VARCHAR NULL,
    alert_when_low BIT(1) NOT NULL DEFAULT E'1',
    frequency VARCHAR NOT NULL DEFAULT 'daily',
    prompt_title_format VARCHAR NOT NULL DEFAULT 'Prompt of the day'
);

INSERT INTO prompt_buckets(server_id, channel_id, reference_handle, display_name) VALUES('240114141031825408', '254309217442332673', 'hijack-daily', 'Hijack Daily Prompts (SFW)');

ALTER TABLE prompts ADD COLUMN bucket_id INTEGER NOT NULL DEFAULT E'1' REFERENCES prompt_buckets(bucket_id);

CREATE TABLE server_features (
    server_id VARCHAR NOT NULL REFERENCES server_configs(server_id),
    feature_id INTEGER NOT NULL,
    is_enabled BIT(1) NOT NULL DEFAULT E'1'
);

CREATE TABLE chronos (
    chrono_id INTEGER NOT NULL UNIQUE,
    chrono_handle VARCHAR(100) NOT NULL UNIQUE,
    required_feature_id INTEGER,
    utc_hour INTEGER NOT NULL
);

INSERT INTO chronos(chrono_id, chrono_handle, required_feature_id, utc_hour) VALUES(1, 'post-new-prompts', 0, 12);
INSERT INTO chronos(chrono_id, chrono_handle, required_feature_id, utc_hour) VALUES(2, 'alert-admins-unconfirmed-prompts', 0, 15);
INSERT INTO chronos(chrono_id, chrono_handle, utc_hour) VALUES(3, 'booty-day', 7);
INSERT INTO chronos(chrono_id, chrono_handle, utc_hour) VALUES(4, 'happy-birthday', 7);
INSERT INTO chronos(chrono_id, chrono_handle, utc_hour) VALUES(5, 'remove-unused-colour-roles', 0);
INSERT INTO chronos(chrono_id, chrono_handle, required_feature_id, utc_hour) VALUES(6, 'alert-low-bucket-queue', 0, 13);

CREATE TABLE server_chronos (
    server_id VARCHAR NOT NULL REFERENCES server_configs(server_id),
    chrono_id INTEGER NOT NULL REFERENCES chronos(chrono_id),
    is_enabled BIT(1) NOT NULL DEFAULT E'1',
    date_last_ran DATE
);
