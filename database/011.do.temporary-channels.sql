CREATE TABLE temporary_channels(
  channel_id VARCHAR(40) NOT NULL,
  server_id VARCHAR(40) NOT NULL,
  creator_user_id VARCHAR(40) NOT NULL,
  created TIMESTAMP NOT NULL,
  expiration TIMESTAMP NOT NULL,
  deletion_time TIMESTAMP NOT NULL,
  has_been_extended BIT(1) NOT NULL DEFAULT E'0',
  topic TEXT NOT NULL,
  UNIQUE(channel_id, server_id)
);
