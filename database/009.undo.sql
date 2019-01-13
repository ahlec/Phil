ALTER TABLE submission_confirmation_queue RENAME TO prompt_confirmation_queue;
ALTER TABLE prompt_confirmation_queue RENAME COLUMN submission_id TO prompt_id;

DROP TABLE prompt_v2;
DROP TABLE submission;

UPDATE
  chronos
SET
  chrono_handle = 'alert-admins-unconfirmed-prompts'
WHERE
  chrono_handle = 'alert-admins-unconfirmed-submissions';
