import Database from '@phil/database';
import { LoggerDefinition } from './@types';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';
import CommandInvocation from '@phil/CommandInvocation';

const successMessageEnd =
  'rejected. You may continue using `{commandPrefix}reject` or start over by using `{commandPrefix}unconfirmed`.';

class RejectCommand extends ConfirmRejectCommandBase {
  public constructor(parentDefinition: LoggerDefinition) {
    super('reject', parentDefinition, {
      multipleItemsConfirmedMessage: `Submissions were ${successMessageEnd}`,
      noItemsConfirmedMessage:
        'No submissions were rejected. This is probably because they were already rejected. You can start over by using `{commandPrefix}unconfirmed` to see all of the still-unconfirmed submissions.',
      oneItemConfirmedMessage: `Submission was ${successMessageEnd}`,
      versionAdded: 1,
    });
  }

  protected async performActionOnSubmission(
    invocation: CommandInvocation,
    database: Database,
    submissionId: number
  ): Promise<boolean> {
    try {
      await database.execute(
        `DELETE FROM
          submission
        WHERE
          submission_id = $1`,
        [submissionId]
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default RejectCommand;
