import { BucketFrequency } from '@phil/buckets';
import Database from '@phil/database';
import Prompt from '@phil/prompts/prompt';
import Submission from '@phil/prompts/submission';
import ServerConfig from '@phil/server-config';
import { LoggerDefinition } from './@types';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';
import Phil from '@phil/phil';

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
    database: Database,
    serverConfig: ServerConfig,
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

    const submission = await Submission.getFromId(
      legacyPhil.bot,
      database,
      submissionId
    );
    if (!submission) {
      return false;
    }

    const prompt = await Prompt.queueSubscription(database, submission);
    if (!prompt) {
      return false;
    }

    this.write(`submission #${submissionId} => prompt #${prompt.id}`);

    if (submission.bucket.frequency !== BucketFrequency.Immediately) {
      return true;
    }

    await prompt.publish(legacyPhil.bot, database, serverConfig);
    return true;
  }
}

export default ConfirmCommand;
