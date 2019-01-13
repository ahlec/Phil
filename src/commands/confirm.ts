import Bucket, { BucketFrequency } from '../buckets';
import Phil from '../phil';
import Prompt from '../prompts/prompt';
import ServerConfig from '../server-config';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';

const successMessageEnd =
  ' confirmed. You may continue using `{commandPrefix}confirm` or start over by using `{commandPrefix}unconfirmed`.';

export default class ConfirmCommand extends ConfirmRejectCommandBase {
  public readonly name = 'confirm';
  public readonly aliases: string[] = [];

  public readonly versionAdded = 1;

  protected readonly noItemsConfirmedMessage =
    'No submissions were confirmed. This is probably because they were already confirmed. You can start over by using `{commandPrefix}unconfirmed` to see all of the still-unconfirmed submissions.';
  protected readonly oneItemConfirmedMessage =
    'Submission was' + successMessageEnd;
  protected readonly multipleItemsConfirmedMessage =
    'Submissions were' + successMessageEnd;

  protected async performActionOnSubmission(
    phil: Phil,
    serverConfig: ServerConfig,
    submissionId: number
  ): Promise<boolean> {
    const numApproved = await phil.db.execute(
      `UPDATE
        submission
      SET
        approved_by_admin = E'1'
      WHERE
        submission_id = $1`,
      [submissionId]
    );

    if (!numApproved) {
      return false;
    }

    const { bucket_id } = await phil.db.querySingle(
      `SELECT
        bucket_id
      FROM
        submission
      WHERE
        submission_id = $1`,
      [submissionId]
    );

    const lastPromptInBucket = await phil.db.querySingle(
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
      [bucket_id]
    );
    const nextPromptNumber =
      (lastPromptInBucket
        ? parseInt(lastPromptInBucket.prompt_number, 10)
        : 0) + 1;

    const promptCreation = await phil.db.query(
      `INSERT INTO
        prompt_v2(
          submission_id,
          prompt_number
        )
      VALUES
        ($1, $2)
      RETURNING
        prompt_id`,
      [submissionId, nextPromptNumber]
    );

    if (!promptCreation.rowCount) {
      return false;
    }

    const { prompt_id } = promptCreation.rows[0];
    console.log('submission #', submissionId, '=> prompt #', prompt_id);

    const bucket = await Bucket.getFromId(phil.bot, phil.db, bucket_id);
    if (bucket.frequency !== BucketFrequency.Immediately) {
      return true;
    }

    const prompt = await Prompt.getFromId(phil.bot, phil.db, prompt_id);
    await prompt.publish(phil.bot, phil.db, serverConfig);
    return true;
  }
}
