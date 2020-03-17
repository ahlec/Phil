import Phil from '@phil/phil';
import ServerConfig from '@phil/server-config';
import { LoggerDefinition } from './@types';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';

const successMessageEnd =
  'rejected. You may continue using `{commandPrefix}reject` or start over by using `{commandPrefix}unconfirmed`.';

export default class RejectCommand extends ConfirmRejectCommandBase {
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
    phil: Phil,
    serverConfig: ServerConfig,
    submissionId: number
  ): Promise<boolean> {
    try {
      await phil.db.execute(
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
