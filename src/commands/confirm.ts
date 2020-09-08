import { BucketFrequency } from '@phil/buckets';
import Database from '@phil/database';
import { LoggerDefinition } from './@types';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';
import Phil from '@phil/phil';
import CommandInvocation from '@phil/CommandInvocation';
import { sendMessageTemplate } from '@phil/utils/discord-migration';

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
    invocation: CommandInvocation,
    database: Database,
    submissionId: number,
    legacyPhil: Phil
  ): Promise<boolean> {
    const numApproved = await database.execute(
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

    const submission = await invocation.context.submissions.retrieve({
      id: submissionId,
      type: 'id',
    });
    if (!submission) {
      return false;
    }

    const prompt = await submission.addToQueue();
    this.write(`submission #${submissionId} => prompt #${prompt.id}`);

    if (submission.bucket.frequency !== BucketFrequency.Immediately) {
      return true;
    }

    await prompt.publish();
    await sendMessageTemplate(
      legacyPhil.bot,
      submission.bucket.channelId,
      prompt.messageTemplate
    );

    return true;
  }
}

export default ConfirmCommand;
