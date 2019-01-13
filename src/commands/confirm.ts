import { BucketFrequency } from '../buckets';
import Phil from '../phil';
import Prompt from '../prompts/prompt';
import Submission from '../prompts/submission';
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

    const submission = await Submission.getFromId(
      phil.bot,
      phil.db,
      submissionId
    );

    const prompt = await Prompt.queueSubscription(phil.db, submission);
    if (!prompt) {
      return false;
    }

    console.log('submission #', submissionId, '=> prompt #', prompt.id);

    if (submission.bucket.frequency !== BucketFrequency.Immediately) {
      return true;
    }

    await prompt.publish(phil.bot, phil.db, serverConfig);
    return true;
  }
}
