import * as moment from 'moment';
import Bucket from '@phil/buckets';
import Database from '@phil/database';
import Prompt from '@phil/prompts/prompt';

export interface PromptDbCreationResult {
  prompt_id: string;
  submission_id: string;
  prompt_number: string;
  prompt_date: string | null;
  repetition_number: string;
}

class Submission {
  public readonly suggestingUserId: string;
  public readonly dateSuggested: moment.Moment;
  public readonly approvedByAdmin: boolean;
  public readonly submittedAnonymously: boolean;
  public readonly submissionText: string;

  public constructor(
    private readonly database: Database,
    public readonly bucket: Bucket,
    public readonly id: number,
    contents: {
      suggestingUserId: string;
      dateSuggested: moment.Moment;
      approvedByAdmin: boolean;
      submittedAnonymously: boolean;
      submissionText: string;
    }
  ) {
    this.suggestingUserId = contents.suggestingUserId;
    this.dateSuggested = contents.dateSuggested;
    this.approvedByAdmin = contents.approvedByAdmin;
    this.submittedAnonymously = contents.submittedAnonymously;
    this.submissionText = contents.submissionText;
  }

  /**
   * Creates a prompt in this submission's bucket (at the end of the
   * queue) for this submission to appear.
   *
   * Submissions have a 1:N relationship with prompts; a single submission
   * can be queued multiple times as multiple separate prompts. An instance
   * of a submission in the queue is referred to as a "prompt."
   */
  public async addToQueue(): Promise<Prompt> {
    const lastPromptInBucket = await this.database.querySingle<{
      prompt_number: string;
    }>(
      `SELECT
        p.prompt_number
      FROM
        prompt_v2 AS p
      JOIN
        submission AS s
      ON
        p.submission_id = s.submission_id
      WHERE
        s.bucket_id = $1
      ORDER BY
        p.prompt_number DESC
      LIMIT 1`,
      [this.bucket.id]
    );
    const nextPromptNumber =
      (lastPromptInBucket
        ? parseInt(lastPromptInBucket.prompt_number, 10)
        : 0) + 1;

    const { count: repetitionNumber } = (await this.database.querySingle<{
      count: string;
    }>(
      `SELECT
        count(*)
      FROM
        prompt_v2
      WHERE
        submission_id = $1`,
      [this.id]
    )) || { count: '0' };

    const creation = await this.database.query<PromptDbCreationResult>(
      `INSERT INTO
          prompt_v2(
            submission_id,
            prompt_number,
            repetition_number
          )
        VALUES
          ($1, $2, $3)
        RETURNING
          prompt_id,
          submission_id,
          prompt_number,
          prompt_date,
          repetition_number`,
      [this.id, nextPromptNumber, repetitionNumber]
    );

    if (!creation.rowCount) {
      throw new Error(
        `Failed to create the prompt in the queue from submission '${this.id}'`
      );
    }

    const [row] = creation.rows;
    return new Prompt(
      this,
      parseInt(row.prompt_id, 10),
      parseInt(row.prompt_number, 10),
      parseInt(row.repetition_number, 10),
      row.prompt_date ? moment(row.prompt_date) : null
    );
  }
}

export default Submission;
