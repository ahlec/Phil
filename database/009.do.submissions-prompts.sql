CREATE TABLE submission(
  submission_id SERIAL NOT NULL UNIQUE,
  bucket_id INTEGER NOT NULL REFERENCES prompt_buckets(bucket_id),
  suggesting_userid VARCHAR(40) NOT NULL,
  date_suggested TIMESTAMP NOT NULL,
  approved_by_admin BIT(1) NOT NULL DEFAULT E'0',
  submitted_anonymously BIT(1) NOT NULL DEFAULT E'0',
  submission_text TEXT NOT NULL
);

CREATE TABLE prompt_v2(
  prompt_id SERIAL NOT NULL UNIQUE,
  submission_id INTEGER NOT NULL REFERENCES submission(submission_id),
  prompt_number INTEGER NOT NULL,
  prompt_date DATE NULL DEFAULT NULL,
  has_been_posted BIT(1) NOT NULL DEFAULT E'0'
);

INSERT INTO
  submission (
    bucket_id,
    suggesting_userid,
    date_suggested,
    approved_by_admin,
    submitted_anonymously,
    submission_text
  )
SELECT
  bucket_id,
  suggesting_userid,
  date_suggested,
  approved_by_admin,
  submitted_anonymously,
  prompt_text
FROM
  prompts;

INSERT INTO
  prompt_v2(
    submission_id,
    prompt_number,
    prompt_date,
    has_been_posted
  )
SELECT
  s.submission_id,
  p.prompt_number,
  p.prompt_date,
  E'1'
FROM
  prompts AS p
JOIN
  submission AS s
ON
  p.prompt_text = s.submission_text AND
  p.suggesting_userid = s.suggesting_userid
WHERE
  p.has_been_posted = E'1';

ALTER TABLE prompt_confirmation_queue RENAME TO submission_confirmation_queue;
ALTER TABLE submission_confirmation_queue RENAME COLUMN prompt_id TO submission_id;

UPDATE
  chronos
SET
  chrono_handle = 'alert-admins-unconfirmed-submissions'
WHERE
  chrono_handle = 'alert-admins-unconfirmed-prompts';
