UPDATE info SET value = '7' WHERE key = 'database-version';

ALTER TABLE requestable_roles ADD COLUMN server_id VARCHAR NOT NULL DEFAULT E'240114141031825408';
