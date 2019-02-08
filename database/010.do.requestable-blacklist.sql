CREATE TABLE requestable_blacklist(
  user_id VARCHAR(40) NOT NULL,
  server_id VARCHAR(40) NOT NULL,
  role_id VARCHAR(40) NOT NULL,
  UNIQUE(user_id, server_id, role_id)
)
