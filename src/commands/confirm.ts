import { BucketFrequency } from '@phil/buckets';
import Phil from '@phil/phil';
import Prompt from '@phil/prompts/prompt';
import Submission from '@phil/prompts/submission';
import ServerConfig from '@phil/server-config';
import { LoggerDefinition } from './@types';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';

const successMessageEnd =
  ' confirmed. You may continue using `{commandPrefix}confirm` or start over by using `{commandPrefix}unconfirmed`.';

class ConfirmCommand extends ConfirmRejectCommandBase {
  public constructor(parentDefinition: LoggerDefinition) {
    super('confirm', parentDefinition, {
      multipleItemsConfirmedMessage: `Submissions were ${successMessageEnd}`,
      noItemsConfirmedMessage:
        'No submissions were confirmed. This is probably because they were already confirmed. You can start over by using `{commandPrefix}unconfirmed` to see all of the still-unconfirmed submissions.',
      oneItemConfirmedMessage: `Submission was ${successMessageEnd}`,
      versionAdded: 1,
    });
  }

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
    if (!submission) {
      return false;
    }

    const prompt = await Prompt.queueSubscription(phil.db, submission);
    if (!prompt) {
      return false;
    }

    this.write(`submission #${submissionId} => prompt #${prompt.id}`);

    if (submission.bucket.frequency !== BucketFrequency.Immediately) {
      return true;
    }

    await prompt.publish(phil.bot, phil.db, serverConfig);
    return true;
  }
}

export default ConfirmCommand;
