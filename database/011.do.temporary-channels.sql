CREATE TABLE temporary_channels(
  channel_id VARCHAR(40) NOT NULL,
  server_id VARCHAR(40) NOT NULL,
  creator_user_id VARCHAR(40) NOT NULL,
  created TIMESTAMP NOT NULL,
  expiration TIMESTAMP NOT NULL,
  has_hidden BIT(1) NOT NULL DEFAULT E'0',
  deletion_time TIMESTAMP NOT NULL,
  num_times_extended INTEGER NOT NULL DEFAULT 0,
  topic TEXT NOT NULL,
  UNIQUE(channel_id, server_id)
);
