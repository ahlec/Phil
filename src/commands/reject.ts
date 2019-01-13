import Phil from '../phil';
import ServerConfig from '../server-config';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';

const successMessageEnd =
  ' rejected. You may continue using `{commandPrefix}reject` or start over by using `{commandPrefix}unconfirmed`.';

export default class RejectCommand extends ConfirmRejectCommandBase {
  public readonly name = 'reject';
  public readonly aliases: string[] = [];

  public readonly versionAdded = 1;

  protected readonly noItemsConfirmedMessage =
    'No submissions were rejected. This is probably because they were already rejected. You can start over by using `{commandPrefix}unconfirmed` to see all of the still-unconfirmed submissions.';
  protected readonly oneItemConfirmedMessage =
    'Submission was' + successMessageEnd;
  protected readonly multipleItemsConfirmedMessage =
    'Submissions were' + successMessageEnd;

  protected async performActionOnSubmission(
    phil: Phil,
    serverConfig: ServerConfig,
    submissionId: number
  ): Promise<boolean> {
    try {
      await !!phil.db.execute(
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
