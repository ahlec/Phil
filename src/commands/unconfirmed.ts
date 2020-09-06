import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Phil from '@phil/phil';
import Submission from '@phil/prompts/submission';
import Command, { LoggerDefinition } from './@types';

const MAX_LIST_LENGTH = 10;

export default class UnconfirmedCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('unconfirmed', parentDefinition, {
      feature: Features.Prompts,
      helpDescription:
        'Creates a list of some of the unconfirmed submissions that are awaiting admin approval before being added to the prompt queue.',
      helpGroup: HelpGroup.Prompts,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 1,
    });
  }

  public async processMessage(
    phil: Phil,
    invocation: CommandInvocation
  ): Promise<void> {
    await phil.db.query(
      'DELETE FROM submission_confirmation_queue WHERE channel_id = $1',
      [invocation.channelId]
    );
    const bucket = await Bucket.retrieveFromCommandArgs(
      phil,
      invocation.commandArgs,
      invocation.serverConfig,
      'unconfirmed',
      false
    );

    const submissions = await Submission.getUnconfirmed(
      phil.db,
      bucket,
      MAX_LIST_LENGTH
    );
    if (submissions.length === 0) {
      await this.outputNoUnconfirmedSubmissions(invocation);
      return;
    }

    for (let index = 0; index < submissions.length; ++index) {
      const submission = submissions[index];
      await phil.db.query(
        'INSERT INTO submission_confirmation_queue VALUES($1, $2, $3)',
        [invocation.channelId, submission.id, index]
      );
    }

    await this.outputList(invocation, submissions);
  }

  private async outputNoUnconfirmedSubmissions(
    invocation: CommandInvocation
  ): Promise<void> {
    await invocation.respond({
      text:
        ':large_blue_diamond: There are no unconfirmed submissions in this bucket right now.',
      type: 'plain',
    });
  }

  private async outputList(
    invocation: CommandInvocation,
    submissions: Submission[]
  ): Promise<void> {
    const are = submissions.length === 1 ? 'is' : 'are';
    const submissionsNoun =
      submissions.length === 1 ? 'submission' : 'submissions';
    let message = `:pencil: Here ${are} ${submissions.length} unconfirmed ${submissionsNoun}.`;

    for (let index = 0; index < submissions.length; ++index) {
      message += `\n        \`${index + 1}\`: "${
        submissions[index].submissionText
      }"`;
    }

    message +=
      '\nConfirm submissions with `' +
      invocation.serverConfig.commandPrefix +
      'confirm`. You can specify a single submission by using its number (`';
    message +=
      invocation.serverConfig.commandPrefix +
      'confirm 3`) or a range of submissions using a hyphen (`' +
      invocation.serverConfig.commandPrefix +
      'confirm 2-7`)';

    await invocation.respond({
      text: message,
      type: 'plain',
    });
  }
}
